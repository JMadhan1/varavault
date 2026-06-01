const VOUCHER_URL = 'https://voucher-backend-agents.vara.network/voucher';
const PID = '0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3';
const HEX = process.argv[2];

if (!HEX) { console.error('Usage: node get_voucher.mjs <operator_hex>'); process.exit(1); }

const getUrl = `${VOUCHER_URL}/${HEX}`;
let state = await fetch(getUrl).then(r => r.json());
process.stderr.write('GET: ' + JSON.stringify(state) + '\n');

let vid = state.voucherId;
const hasPid = Array.isArray(state.programs) && state.programs.includes(PID);

if (!vid || vid === 'null' || !hasPid) {
  process.stderr.write('Requesting voucher...\n');
  const resp = await fetch(VOUCHER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: HEX, programs: [PID] })
  });
  const body = await resp.json();
  process.stderr.write('POST: ' + JSON.stringify(body) + '\n');
  vid = body.voucherId;
}

if (!vid || vid === 'null') { process.stderr.write('ERROR: no voucher obtained\n'); process.exit(1); }
process.stdout.write(vid + '\n');
