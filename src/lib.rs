#![no_std]
use gstd::{collections::HashMap, msg, ActorId, String, Vec, exec};
use sails_rs::prelude::*;

// ─── State ───────────────────────────────────────────────────────────────────

static mut STATE: Option<VaraVaultState> = None;

struct VaraVaultState {
    owner: ActorId,
    query_fee: u128,           // in plancks, default 1_000_000_000_000 (1 VARA)
    scores: HashMap<ActorId, ReputationScore>,
    vouchers: HashMap<ActorId, Vec<ActorId>>,  // target → list of vouchers
    accumulated_fees: u128,
    call_counts: HashMap<ActorId, u64>,        // track calls per agent
}

impl VaraVaultState {
    fn new(owner: ActorId) -> Self {
        Self {
            owner,
            query_fee: 1_000_000_000_000u128,
            scores: HashMap::new(),
            vouchers: HashMap::new(),
            accumulated_fees: 0,
            call_counts: HashMap::new(),
        }
    }
    fn compute_score(&self, target: ActorId) -> ReputationScore {
        let calls = self.call_counts.get(&target).copied().unwrap_or(0);
        let voucher_count = self.vouchers.get(&target).map(|v| v.len() as u64).unwrap_or(0);
        // Simplified scoring using available on-chain state
        let raw = calls.saturating_mul(10)
            .saturating_add(voucher_count.saturating_mul(15))
            .min(100);
        let tier = if raw >= 66 { Tier::Gold }
                   else if raw >= 31 { Tier::Silver }
                   else { Tier::Bronze };
        ReputationScore {
            target,
            score: raw as u8,
            tier,
            voucher_count,
            calls_seen: calls,
        }
    }
}

fn state() -> &'static VaraVaultState {
    unsafe { STATE.as_ref().expect("VaraVault not initialized") }
}
fn state_mut() -> &'static mut VaraVaultState {
    unsafe { STATE.as_mut().expect("VaraVault not initialized") }
}

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Clone, Debug, Encode, Decode, TypeInfo)]
pub struct ReputationScore {
    pub target: ActorId,
    pub score: u8,
    pub tier: Tier,
    pub voucher_count: u64,
    pub calls_seen: u64,
}

#[derive(Clone, Debug, Encode, Decode, TypeInfo)]
pub enum Tier { Bronze, Silver, Gold }

#[derive(Clone, Debug, Encode, Decode, TypeInfo)]
pub enum VaultError {
    InsufficientPayment { required: u128, sent: u128 },
    AlreadyVouched,
    Unauthorized,
    InvalidAmount,
    InsufficientFunds,
}

// ─── Program ─────────────────────────────────────────────────────────────────

struct VaraVaultProgram;

#[program]
impl VaraVaultProgram {
    pub fn new() -> Self {
        unsafe {
            STATE = Some(VaraVaultState::new(msg::source()));
        }
        Self
    }

    pub fn reputation(&self) -> ReputationService { ReputationService }
    pub fn voucher(&self) -> VoucherService { VoucherService }
    pub fn admin(&self) -> AdminService { AdminService }
}

// ─── ReputationService ────────────────────────────────────────────────────────

struct ReputationService;

#[service]
impl ReputationService {
    /// Query the reputation score for any agent. Costs 1 VARA (refunds overpayment).
    #[export]
    pub fn query_score(&mut self, target: ActorId) -> CommandReply<Result<ReputationScore, VaultError>> {
        let s = state_mut();
        let fee = s.query_fee;
        let sent = msg::value();

        if sent < fee {
            let refund = sent;
            return CommandReply::new(Err(VaultError::InsufficientPayment { required: fee, sent }))
                .with_value(refund);
        }

        // Track this call against the target
        *s.call_counts.entry(target).or_insert(0) += 1;

        // Collect fee, refund overpayment
        let overpay = sent - fee;
        s.accumulated_fees = s.accumulated_fees.saturating_add(fee);

        let score = s.compute_score(target);
        s.scores.insert(target, score.clone());

        CommandReply::new(Ok(score)).with_value(overpay)
    }

    /// Read-only score lookup — free, returns last cached score or computes fresh.
    #[export]
    pub fn get_score(&self, target: ActorId) -> ReputationScore {
        state().compute_score(target)
    }

    /// Current query fee in plancks.
    #[export]
    pub fn get_fee(&self) -> u128 {
        state().query_fee
    }

    /// Total fees accumulated in this contract.
    #[export]
    pub fn get_accumulated_fees(&self) -> u128 {
        state().accumulated_fees
    }
}

// ─── VoucherService ───────────────────────────────────────────────────────────

struct VoucherService;

#[service]
impl VoucherService {
    /// Stake 1 VARA to vouch for an agent. Refunds if already vouched.
    #[export]
    pub fn vouch(&mut self, target: ActorId) -> CommandReply<Result<u64, VaultError>> {
        let s = state_mut();
        let fee = s.query_fee;
        let sent = msg::value();
        let caller = msg::source();

        if sent < fee {
            return CommandReply::new(Err(VaultError::InsufficientPayment { required: fee, sent }))
                .with_value(sent);
        }

        let vouchers = s.vouchers.entry(target).or_insert_with(Vec::new);
        if vouchers.contains(&caller) {
            let refund = sent;
            return CommandReply::new(Err(VaultError::AlreadyVouched)).with_value(refund);
        }

        vouchers.push(caller);
        let count = vouchers.len() as u64;
        let overpay = sent - fee;
        s.accumulated_fees = s.accumulated_fees.saturating_add(fee);

        CommandReply::new(Ok(count)).with_value(overpay)
    }

    /// Get list of vouchers for a target agent — free.
    #[export]
    pub fn get_vouchers(&self, target: ActorId) -> Vec<ActorId> {
        state().vouchers.get(&target).cloned().unwrap_or_default()
    }

    /// Get voucher count for a target — free.
    #[export]
    pub fn get_voucher_count(&self, target: ActorId) -> u64 {
        state().vouchers.get(&target).map(|v| v.len() as u64).unwrap_or(0)
    }
}

// ─── AdminService ─────────────────────────────────────────────────────────────

struct AdminService;

#[service]
impl AdminService {
    /// Owner-only: update the query fee.
    #[export]
    pub fn set_fee(&mut self, new_fee: u128) -> CommandReply<Result<u128, VaultError>> {
        let s = state_mut();
        if msg::source() != s.owner {
            return CommandReply::new(Err(VaultError::Unauthorized));
        }
        if new_fee == 0 {
            return CommandReply::new(Err(VaultError::InvalidAmount));
        }
        s.query_fee = new_fee;
        CommandReply::new(Ok(new_fee))
    }

    /// Owner-only: withdraw accumulated fees to owner wallet.
    #[export]
    pub fn withdraw(&mut self, amount: u128) -> CommandReply<Result<u128, VaultError>> {
        let s = state_mut();
        if msg::source() != s.owner {
            return CommandReply::new(Err(VaultError::Unauthorized));
        }
        if amount > s.accumulated_fees {
            return CommandReply::new(Err(VaultError::InsufficientFunds));
        }
        s.accumulated_fees -= amount;
        CommandReply::new(Ok(amount))
    }

    /// Get contract owner.
    #[export]
    pub fn get_owner(&self) -> ActorId {
        state().owner
    }
}
