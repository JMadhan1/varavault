// Direct program upload using vara-wallet internals with Buffer->hex fix
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const WALLET_FILE = '/root/.vara-wallet/wallets/jmadhan-mainnet.json';
const WASM_FILE = '/workspace/target/wasm32-unknown-unknown/release/varavault_program.wasm';
const IDL_FILE = '/workspace/varavault.idl';
const NETWORK = 'wss://rpc.vara.network';

// Load vara-wallet app internals
const appPath = '/usr/local/lib/node_modules/vara-wallet/dist/app.js';

// Read WASM as hex string
const wasmBuf = readFileSync(WASM_FILE);
const wasmHex = '0x' + wasmBuf.toString('hex');
process.stderr.write(`WASM size: ${wasmBuf.length} bytes\n`);
process.stderr.write(`WASM hex prefix: ${wasmHex.slice(0, 10)}...\n`);

// Read wallet JSON
const wallet = JSON.parse(readFileSync(WALLET_FILE, 'utf8'));
process.stderr.write(`Wallet address: ${wallet.address}\n`);

// Read IDL
const idl = readFileSync(IDL_FILE, 'utf8');

// Monkey-patch Buffer.prototype to make startsWith work on Buffers
// This fixes the "code.startsWith is not a function" bug
const origStartsWith = Buffer.prototype.startsWith;
if (!origStartsWith) {
  Buffer.prototype.startsWith = function(prefix) {
    return ('0x' + this.toString('hex')).startsWith(prefix);
  };
  process.stderr.write('Applied Buffer.startsWith patch\n');
}

// Patch toString on Uint8Array too
if (!Uint8Array.prototype.startsWith) {
  Uint8Array.prototype.startsWith = function(prefix) {
    const hex = '0x' + Buffer.from(this).toString('hex');
    return hex.startsWith(prefix);
  };
  process.stderr.write('Applied Uint8Array.startsWith patch\n');
}

process.stderr.write('Patches applied. Now running vara-wallet upload via CLI...\n');
process.stdout.write(wasmHex + '\n');
