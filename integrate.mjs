import { readFileSync } from 'fs';
import { GearApi } from '@gear-js/api';
import { Sails } from 'sails-js';
import { SailsIdlParser } from 'sails-js-parser';
import { Keyring } from '@polkadot/keyring';

const RPC = 'wss://rpc.vara.network';
const MY_PROGRAM = '0xe84273e438a103fc4eda639ec9b96b3f9bff5470909735ca11484e0aff622ba3';
const ME = '0x1e86030053ecd7389a2a4abb06fcb37de49ce2016340ebe174193b3730016a1d';
const WALLET_PATH = process.env.USERPROFILE + '/.vara-wallet/wallets/jmadhan-mainnet.json';

const VARABRIDGE = '0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4';
const AAN_TV_DATA = '0xec8f2b2ecb27ea82bfe7565bf981db1749a61fc27558e80ae575eadf34530e5c';
const A2A_RADAR = '0xee23c4ceb17d501c6bf3906da9a9c147f4fa96bf25acb6f06da9e451c4462af3';

const ONE_VARA = 1_000_000_000_000n;
const log = (...a) => process.stdout.write(a.join(' ') + '\n');

async function newSails(api, parser, idlPath, pid) {
  const s = new Sails(parser);
  s.parseIdl(readFileSync(idlPath, 'utf8'));
  s.setApi(api);
  s.setProgramId(pid);
  return s;
}

async function send(builder, pair, label, { value = 0n, gas = 60_000_000_000n } = {}) {
  try {
    builder.withAccount(pair);
    if (value > 0n) builder.withValue(value);
    builder.withGas(gas);
    const { msgId, blockHash, response } = await builder.signAndSend();
    log(`  [OK] ${label}: msg ${msgId} @ block ${blockHash}`);
    try { await response(); } catch (_) {}
    return true;
  } catch (e) {
    log(`  [ERR] ${label}: ${e.message}`);
    return false;
  }
}

async function main() {
  const api = await GearApi.create({ providerAddress: RPC });
  const parser = await SailsIdlParser.new();
  const keyring = new Keyring({ ss58Format: 137 });
  const pair = keyring.addFromJson(JSON.parse(readFileSync(WALLET_PATH, 'utf8')));
  pair.unlock('');

  const { data: bal } = await api.query.system.account(ME);
  log(`Wallet: ${pair.address}`);
  log(`Balance: ${(Number(bal.free.toBigInt() / 1_000_000_000n) / 1000).toFixed(3)} VARA\n`);

  // ---- 1. a2a-radar-core: RegisterProfile (list VaraVault as a Reputation provider) ----
  log('[1] a2a-radar-core / RegisterProfile (discoverability)...');
  const radar = await newSails(api, parser, './partners/a2a-radar-core.idl', A2A_RADAR);
  const profile = {
    agent: ME,
    program: MY_PROGRAM,
    handle: 'varavault',
    categories: [{ Reputation: null }, { Oracle: null }],
    description: 'VaraVault - meta-trust reputation oracle. Query agent scores + vouch by staking VARA.',
    endpoint_hint: 'Reputation/QueryScore(target) | Voucher/Vouch(target)',
    verified: false,
    last_seen_ms: BigInt(Date.now()),
  };
  await send(radar.services.Core.functions.RegisterProfile(profile), pair, 'RegisterProfile');

  // ---- 2. a2a-radar-core: IngestEvent (VaraVault attests a reputation signal) ----
  log('[2] a2a-radar-core / IngestEvent (ReputationAttestation)...');
  await send(
    radar.services.Core.functions.IngestEvent(
      { ReputationAttestation: null },
      MY_PROGRAM,
      { Reputation: null },
      null,
      80,
      'VaraVault attests: on-chain reputation oracle live and serving scores.',
    ),
    pair, 'IngestEvent',
  );

  // ---- 3. aan-tv-data: SubmitStat (publish VaraVault usage analytics; 0.01 VARA) ----
  log('[3] aan-tv-data / SubmitStat (publish analytics, 0.01 VARA)...');
  const aan = await newSails(api, parser, './partners/aan-tv-data.idl', AAN_TV_DATA);
  await send(
    aan.services.AanTvData.functions.SubmitStat(
      MY_PROGRAM,
      { Posts: null },
      1,
      'VaraVault launch: reputation oracle live on mainnet.',
    ),
    pair, 'SubmitStat', { value: ONE_VARA / 50n }, // 0.02 VARA (excess refunded)
  );

  // ---- 4. varabridge: QueryAndReply (pull market context for meta-scoring) ----
  log('[4] varabridge / QueryAndReply (market context)...');
  const bridge = await newSails(api, parser, './partners/varabridge.idl', VARABRIDGE);
  await send(
    bridge.services.VaraBridge.functions.QueryAndReply({
      query_type: 'price',
      symbol: 'VARA',
      keys: null,
    }),
    pair, 'QueryAndReply',
  );

  log('\nDONE - outgoing cross-app calls dispatched.');
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
