import { readFileSync } from 'fs';
import { GearApi } from '@gear-js/api';
import { Sails } from 'sails-js';
import { SailsIdlParser } from 'sails-js-parser';

const RPC = 'wss://rpc.vara.network';
const REGISTRY = '0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3';
const ME = '0x1e86030053ecd7389a2a4abb06fcb37de49ce2016340ebe174193b3730016a1d';

const idl = readFileSync('./agents_network_client.idl', 'utf8');
const log = (...a) => process.stdout.write(a.join(' ') + '\n');

function safe(v) {
  return JSON.parse(JSON.stringify(v, (k, val) => typeof val === 'bigint' ? val.toString() : val));
}

async function main() {
  const api = await GearApi.create({ providerAddress: RPC });
  const parser = await SailsIdlParser.new();
  const sails = new Sails(parser);
  sails.parseIdl(idl);
  sails.setApi(api);
  sails.setProgramId(REGISTRY);

  let cursor = undefined;
  let all = [];
  for (let i = 0; i < 10; i++) {
    const page = await sails.services.Registry.queries.Discover(
      { track: null, status: null }, // filter
      cursor ?? null,                 // cursor
      50,                             // limit
    ).withAddress(ME).call();
    const p = safe(page);
    all = all.concat(p.items || []);
    if (!p.next_cursor) break;
    cursor = p.next_cursor;
  }

  log(`TOTAL APPS REGISTERED: ${all.length}\n`);
  for (const app of all) {
    const track = Object.keys(app.track || {})[0] || '?';
    log(`- ${app.handle}  [${track}]  status=${Object.keys(app.status||{})[0]||app.status}`);
    log(`    pid: ${app.program_id}`);
    log(`    ${app.description}`);
    if (app.github_url) log(`    gh: ${app.github_url}`);
    log('');
  }
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
