import { readFileSync } from 'fs';
import { GearApi } from '@gear-js/api';
import { Sails } from 'sails-js';
import { SailsIdlParser } from 'sails-js-parser';

const RPC = 'wss://rpc.vara.network';
const REGISTRY = '0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3';
const MY_PROGRAM = '0xe84273e438a103fc4eda639ec9b96b3f9bff5470909735ca11484e0aff622ba3';
const MY_WALLET = '0x1e86030053ecd7389a2a4abb06fcb37de49ce2016340ebe174193b3730016a1d';
const VOUCHER = '0x1f41885cd90ca08cc0bed6414e63e7f20c7a01375fe0ff317adaf848ef8aea04';

const idl = readFileSync('./agents_network_client.idl', 'utf8');

const log = (...a) => process.stdout.write(a.join(' ') + '\n');

async function main() {
  const api = await GearApi.create({ providerAddress: RPC });
  const parser = await SailsIdlParser.new();
  const sails = new Sails(parser);
  sails.parseIdl(idl);
  sails.setApi(api);
  sails.setProgramId(REGISTRY);

  // 1. Participant status
  try {
    const p = await sails.services.Registry.queries.GetParticipant(MY_WALLET, undefined, undefined, MY_WALLET);
    log('PARTICIPANT:', JSON.stringify(p));
  } catch (e) { log('GetParticipant ERR:', e.message); }

  // 2. Application status
  try {
    const a = await sails.services.Registry.queries.GetApplication(MY_WALLET, undefined, undefined, MY_PROGRAM);
    log('APPLICATION:', JSON.stringify(a));
  } catch (e) { log('GetApplication ERR:', e.message); }

  // 3. Resolve handle
  try {
    const h = await sails.services.Registry.queries.ResolveHandle(MY_WALLET, undefined, undefined, 'varavault');
    log('HANDLE varavault:', JSON.stringify(h));
  } catch (e) { log('ResolveHandle ERR:', e.message); }

  // 4. Voucher status
  try {
    const v = await api.voucher.getAllForAccount(MY_WALLET);
    log('VOUCHERS:', JSON.stringify(v));
  } catch (e) { log('Voucher ERR:', e.message); }

  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
