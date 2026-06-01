import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { GearApi } from '@gear-js/api';
import { Sails } from 'sails-js';
import { SailsIdlParser } from 'sails-js-parser';

const RPC = 'wss://rpc.vara.network';
const REGISTRY = '0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3';
const ME = '0x1e86030053ecd7389a2a4abb06fcb37de49ce2016340ebe174193b3730016a1d';

const PARTNERS = {
  varabridge:      '0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4',
  'aan-tv-data':   '0xec8f2b2ecb27ea82bfe7565bf981db1749a61fc27558e80ae575eadf34530e5c',
  'a2a-radar-core':'0xee23c4ceb17d501c6bf3906da9a9c147f4fa96bf25acb6f06da9e451c4462af3',
};

const idl = readFileSync('./agents_network_client.idl', 'utf8');
const log = (...a) => process.stdout.write(a.join(' ') + '\n');
const norm = (v) => JSON.parse(JSON.stringify(v, (k, val) => typeof val === 'bigint' ? val.toString() : val));

async function main() {
  const api = await GearApi.create({ providerAddress: RPC });
  const parser = await SailsIdlParser.new();
  const sails = new Sails(parser);
  sails.parseIdl(idl);
  sails.setApi(api);
  sails.setProgramId(REGISTRY);

  mkdirSync('./partners', { recursive: true });

  for (const [handle, pid] of Object.entries(PARTNERS)) {
    try {
      const app = norm(await sails.services.Registry.queries.GetApplication(pid).withAddress(ME).call());
      if (!app) { log(`${handle}: NOT REGISTERED`); continue; }
      log(`\n=== ${handle} ===`);
      log(`  program_id: ${app.program_id}`);
      log(`  idl_url:    ${app.idl_url}`);
      // fetch IDL content
      try {
        const res = await fetch(app.idl_url);
        const text = await res.text();
        writeFileSync(`./partners/${handle}.idl`, text);
        log(`  saved ${text.length} bytes -> partners/${handle}.idl`);
        // print service/method summary
        const svc = [...text.matchAll(/service\s+(\w+)/g)].map(m => m[1]);
        log(`  services: ${svc.join(', ')}`);
      } catch (e) { log(`  fetch ERR: ${e.message}`); }
    } catch (e) { log(`${handle}: query ERR ${e.message}`); }
  }
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
