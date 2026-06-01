import { readFileSync } from 'fs';
import { GearApi } from '@gear-js/api';
import { Sails } from 'sails-js';
import { SailsIdlParser } from 'sails-js-parser';
import { Keyring } from '@polkadot/keyring';

const RPC = 'wss://rpc.vara.network';
const REGISTRY = '0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3';
const VOUCHER = '0x1f41885cd90ca08cc0bed6414e63e7f20c7a01375fe0ff317adaf848ef8aea04';
const WALLET_PATH = process.env.USERPROFILE + '/.vara-wallet/wallets/jmadhan-mainnet.json';

const PARTICIPANT_HANDLE = 'jmadhan';
const GITHUB = 'https://github.com/JMadhan1/varavault';

const idl = readFileSync('./agents_network_client.idl', 'utf8');
const reqArr = JSON.parse(readFileSync('./register-app.json', 'utf8'));
const req = reqArr[0];

const log = (...a) => process.stdout.write(a.join(' ') + '\n');

async function sendWithVoucher(builder, label) {
  try {
    builder.withVoucher(VOUCHER);
    await builder.calculateGas();
    const { msgId, blockHash, response } = await builder.signAndSend();
    log(`  ${label}: msg ${msgId} in block ${blockHash}`);
    const result = await response();
    log(`  ${label}: OK ->`, JSON.stringify(result));
    return { ok: true, result };
  } catch (e) {
    log(`  ${label}: ERR -> ${e.message}`);
    return { ok: false, error: e.message };
  }
}

async function main() {
  const api = await GearApi.create({ providerAddress: RPC });
  const parser = await SailsIdlParser.new();
  const sails = new Sails(parser);
  sails.parseIdl(idl);
  sails.setApi(api);
  sails.setProgramId(REGISTRY);

  const keyring = new Keyring({ ss58Format: 137 });
  const walletJson = JSON.parse(readFileSync(WALLET_PATH, 'utf8'));
  const pair = keyring.addFromJson(walletJson);
  pair.unlock('');
  log('Wallet:', pair.address);

  // Build the RegisterAppReq matching IDL field order/types
  const registerReq = {
    handle: req.handle,
    program_id: req.program_id,
    operator: req.operator,
    github_url: req.github_url,
    skills_hash: req.skills_hash,
    skills_url: req.skills_url,
    idl_hash: req.idl_hash,
    idl_url: req.idl_url,
    description: req.description,
    track: req.track,
    contacts: req.contacts,
  };
  log('RegisterAppReq:', JSON.stringify(registerReq));

  // 1. RegisterParticipant (idempotent-ish; ignore if already registered)
  log('[1] RegisterParticipant...');
  const b1 = sails.services.Registry.functions.RegisterParticipant(PARTICIPANT_HANDLE, GITHUB);
  b1.withAccount(pair);
  await sendWithVoucher(b1, 'RegisterParticipant');

  // 2. RegisterApplication
  log('[2] RegisterApplication...');
  const b2 = sails.services.Registry.functions.RegisterApplication(registerReq);
  b2.withAccount(pair);
  const r2 = await sendWithVoucher(b2, 'RegisterApplication');

  // 3. SubmitApplication
  log('[3] SubmitApplication...');
  const b3 = sails.services.Registry.functions.SubmitApplication(req.program_id);
  b3.withAccount(pair);
  await sendWithVoucher(b3, 'SubmitApplication');

  log('DONE');
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
