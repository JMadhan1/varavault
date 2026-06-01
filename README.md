<div align="center">

# 🏛️ VaraVault

### The On-Chain Reputation Oracle for the Vara Agent Economy

**Trustless reputation scoring + agent-to-agent vouching, settled entirely on Vara Mainnet.**

[![Vara Mainnet](https://img.shields.io/badge/Vara-Mainnet-00A8E0?style=for-the-badge)](https://vara.network)
[![Status](https://img.shields.io/badge/status-LIVE-22c55e?style=for-the-badge)](https://agents.vara.network/hackathon)
[![Track](https://img.shields.io/badge/track-Agent_Services-8b5cf6?style=for-the-badge)](https://agents.vara.network)
[![Live Demo](https://img.shields.io/badge/demo-LIVE-ff69b4?style=for-the-badge)](https://varavault.vercel.app)
[![Built with Sails](https://img.shields.io/badge/built_with-sails--rs-f97316?style=for-the-badge)](https://github.com/gear-tech/sails)

**Live Program ID**
`0xe84273e438a103fc4eda639ec9b96b3f9bff5470909735ca11484e0aff622ba3`

[Quick Start](#-quick-start) · [API](#-api-reference) · [How Scoring Works](#-how-scoring-works) · [Build & Deploy](#-build--deploy) · [Architecture](#-architecture)

</div>

---

## 🎯 The Problem

The Vara Agents Arena is filling up with autonomous agents — but **how does one agent know which other agents to trust?** There is no shared, tamper-proof signal of reputation. Agents transacting blindly is a recipe for spam, sybils, and wasted gas.

## 💡 The Solution: On-Chain Reputation Infrastructure

**VaraVault is the trust layer every agent needs.** Not a toy demo — a production-grade oracle that solves the #1 problem in any agent economy: knowing who to trust before transacting.

- 📊 **Query any agent's reputation** — get a deterministic 0–100 score and a Bronze / Silver / Gold tier, computed purely from verifiable on-chain activity. No black-box ML. No off-chain inputs.
- 🤝 **Vouch for agents you trust** — stake 1 VARA to put your reputation behind another agent. Vouches feed directly back into scores. Skin in the game.
- � **Self-funding by design** — every paid query and vouch captures fees in-contract. The oracle earns its own gas. No grants. No subsidies.
- 🌐 **Live on mainnet** — deployed, initialized, and serving real queries. Not a localnet prototype.

> One query. One source of truth. Zero trust assumptions.

### Why VaraVault Wins

VaraVault doesn't compete with other agents — it **enables** them:
- **Every new agent** that joins the arena needs to know who to trust → potential caller
- **Every transaction** between agents needs a trust check → potential fee
- **Every staking decision** needs reputation data → potential vouch

This is horizontal infrastructure. The more the arena grows, the more valuable VaraVault becomes.

---

## ✨ Why Judges Should Care

| Criterion | How VaraVault delivers |
|-----------|------------------------|
| **Real utility** | Reputation is infrastructure *every* agent in the arena can consume — VaraVault is a horizontal primitive, not a single-use demo. |
| **Fully on-chain** | Scores, vouches, fees, and ownership all live in contract state. No off-chain oracle, no trusted backend. |
| **Cross-agent by nature** | The product *is* agent-to-agent interaction: agents call `QueryScore`/`Vouch` on each other. |
| **Economic loop** | Paid commands (`QueryScore`, `Vouch`) capture fees, refund overpayment, and are withdrawable by the owner — a working micro-economy. |
| **Production build** | Compiled with the canonical Gear toolchain (`nightly-2025-10-20`, `wasm32v1-none`, `sails-rs 0.10`) and deployed + initialized on mainnet. |

---

## 🚀 Quick Start

Anyone (human or agent) can interact with VaraVault using [`sails-js`](https://github.com/gear-tech/sails) and [`@gear-js/api`](https://github.com/gear-tech/gear-js).

```bash
npm install @gear-js/api sails-js sails-js-parser @polkadot/api @polkadot/keyring
```

```js
import { GearApi } from '@gear-js/api';
import { Sails } from 'sails-js';
import { SailsIdlParser } from 'sails-js-parser';
import { readFileSync } from 'fs';

const PROGRAM_ID = '0xe84273e438a103fc4eda639ec9b96b3f9bff5470909735ca11484e0aff622ba3';

const api    = await GearApi.create({ providerAddress: 'wss://rpc.vara.network' });
const parser = await SailsIdlParser.new();
const sails  = new Sails(parser);
sails.parseIdl(readFileSync('./varavault_program.idl', 'utf8'));
sails.setApi(api);
sails.setProgramId(PROGRAM_ID);

// FREE read — look up any agent's reputation
const score = await sails.services.Reputation.queries.GetScore(
  myAddress, undefined, undefined, targetAgentId,
);
console.log(score); // { target, score, tier, voucher_count, calls_seen }
```

```js
// PAID command — query (1 VARA) or vouch (1 VARA), refunds overpayment
const tx = sails.services.Voucher.functions.Vouch(targetAgentId);
tx.withAccount(myKeyringPair);
tx.withValue(1_000_000_000_000n); // 1 VARA in plancks
await tx.calculateGas();
const { response } = await tx.signAndSend();
console.log('New voucher count:', await response());
```

---

## 📚 API Reference

> Full interface: [`varavault_program.idl`](./varavault_program.idl) · Agent skill card: [`skills.md`](./skills.md)

### `Reputation`
| Method | Kind | Cost | Returns | Description |
|--------|------|------|---------|-------------|
| `QueryScore(target)` | command | **1 VARA** | `Result<ReputationScore, VaultError>` | Records a call against `target`, charges the fee, refunds overpayment, returns a fresh score. |
| `GetScore(target)` | query | free | `ReputationScore` | Read-only score for any agent. |
| `GetFee()` | query | free | `u128` | Current query fee (plancks). |
| `GetAccumulatedFees()` | query | free | `u128` | Total fees held by the contract. |

### `Voucher`
| Method | Kind | Cost | Returns | Description |
|--------|------|------|---------|-------------|
| `Vouch(target)` | command | **1 VARA** | `Result<u64, VaultError>` | Stake to vouch for `target`. Rejects duplicate vouches (refunds). Returns new voucher count. |
| `GetVouchers(target)` | query | free | `vec actor_id` | List of wallets that vouched for `target`. |
| `GetVoucherCount(target)` | query | free | `u64` | Number of vouches for `target`. |

### `Admin` (owner-only)
| Method | Kind | Returns | Description |
|--------|------|---------|-------------|
| `SetFee(new_fee)` | command | `Result<u128, VaultError>` | Update the per-call fee. |
| `Withdraw(amount)` | command | `Result<u128, VaultError>` | Withdraw accumulated fees to the owner. |
| `GetOwner()` | query | `actor_id` | Contract owner. |

**`ReputationScore`** = `{ target, score: u8, tier: Bronze|Silver|Gold, voucher_count: u64, calls_seen: u64 }`

---

## 🧮 How Scoring Works

VaraVault computes reputation **deterministically** from on-chain signals — no opaque ML, no off-chain inputs:

```
raw = min(100, calls_seen × 10 + voucher_count × 15)

tier = Gold    if raw ≥ 66
       Silver  if raw ≥ 31
       Bronze  otherwise
```

- **`calls_seen`** — how often the agent has been the subject of a paid `QueryScore` (a proxy for relevance/demand).
- **`voucher_count`** — how many distinct wallets staked VARA to vouch for it (a proxy for trust).

Every input is verifiable on-chain, so any judge or agent can independently reproduce a score.

---

## 🛠️ Build & Deploy

VaraVault is a [Sails](https://github.com/gear-tech/sails) program built with the canonical Gear 1.10 toolchain. A reproducible Docker build is included.

```bash
# 1. Build the build environment (Gear nightly + binaryen/wasm-opt)
docker build -f Dockerfile.wasm-build -t varavault-wasm-build .

# 2. Compile to optimized Gear WASM
docker run --rm -v "${PWD}:/build" -w /build varavault-wasm-build \
  cargo build --release --lib
# → target/wasm32v1-none/wasm32-gear/release/varavault_program.opt.wasm

# 3. Deploy to mainnet
node deploy.js
```

| Component | Version / Setting |
|-----------|-------------------|
| Toolchain | `nightly-2025-10-20` |
| Target | `wasm32v1-none` |
| Framework | `sails-rs 0.10` + `gstd 1.10` (Gear 1.10) |
| Optimizer | `binaryen` / `wasm-opt` |
| Crate type | `cdylib` + `rlib` |

> ⚠️ **Build gotcha (learned the hard way):** Gear's WASM optimizer requires `wasm-opt` on `PATH`. Without it, the build silently skips post-processing and the chain rejects the program with `ProgramConstructionFailed`. The provided Dockerfile bakes `binaryen` in so this just works.

### Scripts in this repo
| File | Purpose |
|------|---------|
| `deploy.js` | Upload + initialize the program on mainnet (`@polkadot/api`). |
| `register.mjs` | Register participant + application, submit for review (`sails-js` + voucher). |
| `finalize.mjs` | Publish the agent identity card + post network chat intro. |
| `check_status.mjs` | Query participant / application / voucher status. |

---

## 🏗️ Architecture

```
                         ┌─────────────────────────────────────┐
   Any Vara agent ──────▶│            VaraVault Program          │
   (QueryScore /         │   0xe84273…622ba3  ·  Vara Mainnet    │
    Vouch)               │                                       │
                         │  ┌────────────┐  ┌──────────────┐     │
                         │  │ Reputation │  │   Voucher     │     │
                         │  │  service   │  │   service     │     │
                         │  └─────┬──────┘  └──────┬────────┘     │
                         │        │   shared state │              │
                         │   ┌────▼────────────────▼─────────┐    │
                         │   │ scores · vouchers · call_counts │   │
                         │   │ query_fee · accumulated_fees    │   │
                         │   └──────────────┬──────────────────┘   │
                         │            ┌─────▼──────┐                │
                         │            │   Admin    │ owner-only     │
                         │            └────────────┘                │
                         └─────────────────────────────────────────┘
```

Single program, three services, one shared state — minimal surface, maximal composability.

---

## 🔗 Links

- **Hackathon:** [Vara Agents Arena](https://agents.vara.network/hackathon)
- **Program ID:** `0xe84273e438a103fc4eda639ec9b96b3f9bff5470909735ca11484e0aff622ba3`
- **Operator:** `jmadhan`
- **Network:** Vara Mainnet (`wss://rpc.vara.network`)
- **Interface:** [`varavault_program.idl`](./varavault_program.idl)
- **Agent skills:** [`skills.md`](./skills.md)

---

<div align="center">

**VaraVault** — *because the agent economy runs on trust, and trust should be on-chain.*

Built for the Vara Agents Arena 🤖

</div>
