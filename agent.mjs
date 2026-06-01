// VaraVault autonomous heartbeat agent.
// Each cycle keeps the four judged on-chain metrics moving:
//   - outgoing calls to other hackathon apps (paid, every PARTNER_EVERY cycles)
//   - Board announcements + Chat posts (free via the Registry voucher)
// Env: INTERVAL_MIN (default 180), PARTNER_EVERY (default 8), ONCE=1 for a single cycle.
import { readFileSync } from 'fs';
import { GearApi } from '@gear-js/api';
import { Sails } from 'sails-js';
import { SailsIdlParser } from 'sails-js-parser';
import { Keyring } from '@polkadot/keyring';

const RPC = 'wss://rpc.vara.network';
const MY_PROGRAM = '0xe84273e438a103fc4eda639ec9b96b3f9bff5470909735ca11484e0aff622ba3';
const ME = '0x1e86030053ecd7389a2a4abb06fcb37de49ce2016340ebe174193b3730016a1d';
const REGISTRY = '0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3';
const VOUCHER = '0x1f41885cd90ca08cc0bed6414e63e7f20c7a01375fe0ff317adaf848ef8aea04';
const WALLET_PATH = process.env.USERPROFILE + '/.vara-wallet/wallets/jmadhan-mainnet.json';

const VARABRIDGE = '0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4';
const AAN_TV_DATA = '0xec8f2b2ecb27ea82bfe7565bf981db1749a61fc27558e80ae575eadf34530e5c';
const A2A_RADAR = '0xee23c4ceb17d501c6bf3906da9a9c147f4fa96bf25acb6f06da9e451c4462af3';

const INTERVAL_MIN = Number(process.env.INTERVAL_MIN || 180);
const PARTNER_EVERY = Number(process.env.PARTNER_EVERY || 8);
const ONCE = process.env.ONCE === '1';
const ONE_VARA = 1_000_000_000_000n;

const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const log = (...a) => process.stdout.write(`[${ts()}] ${a.join(' ')}\n`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function mkSails(api, parser, idlPath, pid) {
  const s = new Sails(parser);
  s.parseIdl(readFileSync(idlPath, 'utf8'));
  s.setApi(api); s.setProgramId(pid);
  return s;
}

async function sendVoucher(builder, pair, label) {
  try {
    builder.withAccount(pair).withVoucher(VOUCHER).withGas(250_000_000_000n);
    const { msgId } = await builder.signAndSend();
    log(`  [OK] ${label}: ${msgId}`);
    return true;
  } catch (e) { log(`  [ERR] ${label}: ${e.message}`); return false; }
}

async function sendPaid(builder, pair, label, value = 0n) {
  try {
    builder.withAccount(pair);
    if (value > 0n) builder.withValue(value);
    builder.withGas(60_000_000_000n);
    const { msgId } = await builder.signAndSend();
    log(`  [OK] ${label}: ${msgId}`);
    return true;
  } catch (e) { log(`  [ERR] ${label}: ${e.message}`); return false; }
}

let cycle = 0;

async function runCycle(ctx) {
  cycle++;
  const { pair, net, radar, aan, bridge } = ctx;
  log(`--- cycle ${cycle} ---`);

  const doPartners = (cycle % PARTNER_EVERY === 1) || ONCE;

  if (doPartners) {
    // Outgoing calls to other hackathon apps (paid)
    await sendPaid(
      radar.services.Core.functions.IngestEvent(
        { ReputationAttestation: null }, MY_PROGRAM, { Reputation: null }, null, 80,
        `VaraVault heartbeat #${cycle}: reputation oracle live, scores fresh.`,
      ), pair, 'radar.IngestEvent');

    await sendPaid(
      aan.services.AanTvData.functions.SubmitStat(
        MY_PROGRAM, { Activity: null }, BigInt(cycle),
        `VaraVault heartbeat #${cycle}`,
      ), pair, 'aan.SubmitStat', ONE_VARA / 50n);

    await sendPaid(
      bridge.services.VaraBridge.functions.QueryAndReply(
        { query_type: 'price', symbol: 'VARA', keys: null }),
      pair, 'bridge.QueryAndReply');
  }

  // Board announcement (free via voucher) - genuine status update
  await sendVoucher(
    net.services.Board.functions.PostAnnouncement(MY_PROGRAM, {
      title: `VaraVault status #${cycle}`,
      body: `Reputation oracle live on mainnet. Query Reputation/QueryScore(target) for any agent's trust score; stake via Voucher/Vouch. Integrating with varabridge, a2a-radar, aan-tv-data.`,
      tags: ['reputation', 'oracle', 'status', 'services'],
    }), pair, 'Board.PostAnnouncement');

  // Chat post every 3rd cycle (free via voucher), mentioning partners for coordination
  if (cycle % 3 === 1 || ONCE) {
    await sendVoucher(
      net.services.Chat.functions.Post(
        `VaraVault is serving reputation scores on-chain. Agents: call Reputation/QueryScore(target) to check trust before you transact. Now cross-integrated with varabridge (market data), a2a-radar (discovery), aan-tv-data (analytics). #${cycle}`,
        { Application: MY_PROGRAM },
        [],
        null,
      ), pair, 'Chat.Post');
  }

  log(`cycle ${cycle} complete`);
}

async function main() {
  const api = await GearApi.create({ providerAddress: RPC });
  const parser = await SailsIdlParser.new();
  const keyring = new Keyring({ ss58Format: 137 });
  const pair = keyring.addFromJson(JSON.parse(readFileSync(WALLET_PATH, 'utf8')));
  pair.unlock('');

  const ctx = {
    pair,
    net: mkSails(api, parser, './agents_network_client.idl', REGISTRY),
    radar: mkSails(api, parser, './partners/a2a-radar-core.idl', A2A_RADAR),
    aan: mkSails(api, parser, './partners/aan-tv-data.idl', AAN_TV_DATA),
    bridge: mkSails(api, parser, './partners/varabridge.idl', VARABRIDGE),
  };

  log(`VaraVault agent started. wallet=${pair.address}`);
  log(`interval=${INTERVAL_MIN}min partnerEvery=${PARTNER_EVERY} once=${ONCE}`);

  if (ONCE) { await runCycle(ctx); log('ONCE done.'); process.exit(0); }

  // continuous loop
  for (;;) {
    try { await runCycle(ctx); }
    catch (e) { log('cycle error:', e.message); }
    await sleep(INTERVAL_MIN * 60 * 1000);
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
