#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createKeyringPair } = require('@polkadot/keyring');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { u8aToHex } = require('@polkadot/util');

const RPC = 'wss://rpc.vara.network';
const WASM_PATH = path.join(__dirname, 'target/wasm32v1-none/wasm32-gear/release/varavault_program.opt.wasm');
const WALLET_PATH = path.join(process.env.USERPROFILE, '.vara-wallet/wallets/jmadhan-mainnet.json');

async function deploy() {
  console.log('[1/4] Loading WASM...');
  if (!fs.existsSync(WASM_PATH)) throw new Error(`WASM not found: ${WASM_PATH}`);
  const wasmBuf = fs.readFileSync(WASM_PATH);
  console.log(`  ✓ WASM loaded: ${wasmBuf.length} bytes`);

  console.log('[2/4] Loading wallet...');
  if (!fs.existsSync(WALLET_PATH)) throw new Error(`Wallet not found: ${WALLET_PATH}`);
  const walletJson = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));

  const keyring = new (require('@polkadot/keyring')).Keyring({ ss58Format: 137 });
  const pair = keyring.addFromJson(walletJson);
  pair.unlock(''); // Empty password for unencrypted wallet
  console.log(`  ✓ Wallet loaded: ${pair.address}`);

  console.log('[3/4] Connecting to Vara...');
  const provider = new WsProvider(RPC);
  const api = await ApiPromise.create({ provider });
  console.log(`  ✓ Connected to Vara at block ${(await api.rpc.chain.getHeader()).number}`);

  console.log('[4/4] Uploading program...');
  // Random 32-byte salt for unique program ID
  const salt = '0x' + require('crypto').randomBytes(32).toString('hex');
  console.log(`  Salt: ${salt}`);
  // Sails init payload: SCALE-encoded constructor name "New" = compact(3) + bytes("New")
  const initPayload = '0x0c4e6577'; // SCALE string "New"
  const tx = api.tx.gear.uploadProgram(wasmBuf, salt, initPayload, 250_000_000_000, 0, false);

  return new Promise((resolve, reject) => {
    tx.signAndSend(pair, ({ status, dispatchError, events }) => {
      // Log all events for debugging
      if (events && events.length) {
        events.forEach(({ event }) => {
          const { method, section, data } = event;
          console.log(`  event: ${section}.${method} ${data.toString()}`);
        });
      }

      if (dispatchError) {
        if (dispatchError.isModule) {
          try {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            console.error(`  ✗ Error: ${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`);
          } catch(e) {
            const { index, error } = dispatchError.asModule;
            console.error(`  ✗ Error: Module ${index}, Code ${error}`);
          }
        } else {
          console.error(`  ✗ Error: ${dispatchError.toString()}`);
        }
        reject(new Error(JSON.stringify(dispatchError.toJSON())));
        return;
      }

      if (status.isInBlock) {
        console.log(`  → In block: ${status.asInBlock}`);
      } else if (status.isFinalized) {
        console.log(`  ✓ Finalized in block: ${status.asFinalized}`);

        let programId = null;
        for (const event of events) {
          const { data, method, section } = event.event;
          if (section === 'gear' && method === 'ProgramSet') {
            programId = data[0].toString();
            console.log(`\n✅ PROGRAM_ID=${programId}\n`);
            resolve(programId);
            return;
          }
        }
        reject(new Error('ProgramSet event not found'));
      }
    }).catch(reject);
  });
}

deploy().catch(err => {
  console.error('Deploy failed:', err.message);
  process.exit(1);
});
