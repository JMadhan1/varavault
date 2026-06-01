import { GearApi } from '@gear-js/api';
import { Sails } from 'sails-js';
import { SailsIdlParser } from 'sails-js-parser';
import { VARAVAULT_IDL } from './varavault.idl.js';

export const RPC = 'wss://rpc.vara.network';
export const PROGRAM_ID = '0xe84273e438a103fc4eda639ec9b96b3f9bff5470909735ca11484e0aff622ba3';
// Any valid address works as the query origin (msg::source for read-only calls).
const QUERY_ORIGIN = '0x0000000000000000000000000000000000000000000000000000000000000000';

let _state = null;

export async function initVault() {
  if (_state) return _state;
  const api = await GearApi.create({ providerAddress: RPC });
  const parser = await SailsIdlParser.new();
  const sails = new Sails(parser);
  sails.parseIdl(VARAVAULT_IDL);
  sails.setApi(api);
  sails.setProgramId(PROGRAM_ID);
  _state = { api, sails };
  return _state;
}

const tierName = (t) => (typeof t === 'string' ? t : Object.keys(t || {})[0] || 'Bronze');

export async function getScore(target) {
  const { sails } = await initVault();
  const r = await sails.services.Reputation.queries
    .GetScore(target).withAddress(QUERY_ORIGIN).call();
  return {
    target: r.target,
    score: Number(r.score),
    tier: tierName(r.tier),
    voucherCount: Number(r.voucher_count),
    callsSeen: Number(r.calls_seen),
  };
}

export async function getFee() {
  const { sails } = await initVault();
  const r = await sails.services.Reputation.queries.GetFee().withAddress(QUERY_ORIGIN).call();
  return BigInt(r);
}

export async function getAccumulatedFees() {
  const { sails } = await initVault();
  const r = await sails.services.Reputation.queries.GetAccumulatedFees().withAddress(QUERY_ORIGIN).call();
  return BigInt(r);
}

export async function getVoucherCount(target) {
  const { sails } = await initVault();
  const r = await sails.services.Voucher.queries.GetVoucherCount(target).withAddress(QUERY_ORIGIN).call();
  return Number(r);
}

export async function getVouchers(target) {
  const { sails } = await initVault();
  const r = await sails.services.Voucher.queries.GetVouchers(target).withAddress(QUERY_ORIGIN).call();
  return r || [];
}

export function formatVara(plancks) {
  const n = Number(plancks) / 1e12;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export async function getLeaderboard(agentIds) {
  const results = [];
  for (const agent of agentIds) {
    try {
      const score = await getScore(agent);
      const label = agent === PROGRAM_ID ? 'VaraVault' :
                    agent === '0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4' ? 'varabridge' :
                    agent === '0xee23c4ceb17d501c6bf3906da9a9c147f4fa96bf25acb6f06da9e451c4462af3' ? 'a2a-radar' :
                    agent === '0xec8f2b2ecb27ea82bfe7565bf981db1749a61fc27558e80ae575eadf34530e5c' ? 'aan-tv-data' : agent.slice(0, 10);
      results.push({
        id: agent,
        label,
        score: score.score,
        tier: score.tier,
        callsSeen: score.callsSeen,
        voucherCount: score.voucherCount,
      });
    } catch (e) {
      // Skip agents that error
    }
  }
  return results.sort((a, b) => b.score - a.score);
}
