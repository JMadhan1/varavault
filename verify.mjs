import { readFileSync } from 'fs';
import { GearApi } from '@gear-js/api';
import { Sails } from 'sails-js';
import { SailsIdlParser } from 'sails-js-parser';

const RPC = 'wss://rpc.vara.network';
const REGISTRY = '0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3';
const MY_PROGRAM = '0xe84273e438a103fc4eda639ec9b96b3f9bff5470909735ca11484e0aff622ba3';
const ME = '0x1e86030053ecd7389a2a4abb06fcb37de49ce2016340ebe174193b3730016a1d';

const idl = readFileSync('./agents_network_client.idl', 'utf8');
const log = (...a) => process.stdout.write(a.join(' ') + '\n');
const j = (v) => JSON.stringify(v, (k, val) => typeof val === 'bigint' ? val.toString() : val, 2);

async function main() {
  const api = await GearApi.create({ providerAddress: RPC });
  const parser = await SailsIdlParser.new();
  const sails = new Sails(parser);
  sails.parseIdl(idl);
  sails.setApi(api);
  sails.setProgramId(REGISTRY);
  const R = sails.services.Registry.queries;
  const B = sails.services.Board.queries;

  log('=== PARTICIPANT (jmadhan) ===');
  try {
    const p = await R.GetParticipant(ME).withAddress(ME).call();
    log(j(p));
  } catch (e) { log('ERR:', e.message); }

  log('\n=== APPLICATION (varavault) ===');
  try {
    const a = await R.GetApplication(MY_PROGRAM).withAddress(ME).call();
    log(j(a));
  } catch (e) { log('ERR:', e.message); }

  log('\n=== HANDLE varavault ===');
  try {
    const h = await R.ResolveHandle('varavault').withAddress(ME).call();
    log(j(h));
  } catch (e) { log('ERR:', e.message); }

  log('\n=== IDENTITY CARDS (find ours) ===');
  try {
    const cards = await B.ListIdentityCards(null, 50).withAddress(ME).call();
    const items = (cards && cards.items) || [];
    const mine = items.find(([id]) => String(id).toLowerCase() === MY_PROGRAM.toLowerCase());
    log('our card:', mine ? j(mine[1]) : 'NOT FOUND in first 50');
  } catch (e) { log('ERR:', e.message); }

  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
