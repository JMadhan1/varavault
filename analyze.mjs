import { readFileSync, writeFileSync } from 'fs';
import { GearApi } from '@gear-js/api';
import { Sails } from 'sails-js';
import { SailsIdlParser } from 'sails-js-parser';

const RPC = 'wss://rpc.vara.network';
const REGISTRY = '0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3';
const ME = '0x1e86030053ecd7389a2a4abb06fcb37de49ce2016340ebe174193b3730016a1d';

const idl = readFileSync('./agents_network_client.idl', 'utf8');
const log = (...a) => process.stdout.write(a.join(' ') + '\n');
const norm = (v) => JSON.parse(JSON.stringify(v, (k, val) => typeof val === 'bigint' ? val.toString() : val));

const TRACKS = ['Services', 'Social', 'Economy', 'Open'];
const STATUS = ['Building', 'Live', 'Submitted', 'Finalist', 'Winner'];
const dec = (v, arr) => typeof v === 'number' ? arr[v] : (typeof v === 'string' ? v : Object.keys(v || {})[0]);

async function main() {
  const api = await GearApi.create({ providerAddress: RPC });
  const parser = await SailsIdlParser.new();
  const sails = new Sails(parser);
  sails.parseIdl(idl);
  sails.setApi(api);
  sails.setProgramId(REGISTRY);

  let cursor = null, all = [];
  for (let i = 0; i < 20; i++) {
    const page = norm(await sails.services.Registry.queries
      .Discover({ track: null, status: null }, cursor, 50).withAddress(ME).call());
    all = all.concat(page.items || []);
    if (!page.next_cursor) break;
    cursor = page.next_cursor;
  }

  // Normalize
  const apps = all.map(a => ({
    handle: a.handle,
    track: dec(a.track, TRACKS),
    status: dec(a.status, STATUS),
    program_id: a.program_id,
    description: a.description,
    github_url: a.github_url,
  }));
  writeFileSync('./van-apps.json', JSON.stringify(apps, null, 2));

  log(`TOTAL APPS: ${apps.length}\n`);

  // By track
  const byTrack = {};
  for (const t of TRACKS) byTrack[t] = apps.filter(a => a.track === t);
  for (const t of TRACKS) log(`${t}: ${byTrack[t].length}`);
  log(`Submitted: ${apps.filter(a => a.status === 'Submitted').length} / Building: ${apps.filter(a => a.status === 'Building').length}\n`);

  // Direct competitors: reputation / trust / oracle keywords
  const kw = /reput|trust|oracle|vouch|score|endors|attest|credib|rank/i;
  log('=== DIRECT COMPETITORS (reputation/trust/oracle) ===');
  for (const a of apps.filter(a => kw.test(a.description) || kw.test(a.handle))) {
    log(`\n[${a.track}/${a.status}] ${a.handle}`);
    log(`  ${a.description}`);
    log(`  gh: ${a.github_url}`);
  }

  log('\n\n=== ALL SERVICES-TRACK APPS ===');
  for (const a of byTrack.Services) {
    log(`\n[${a.status}] ${a.handle}`);
    log(`  ${a.description}`);
    log(`  gh: ${a.github_url}`);
  }

  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
