#!/bin/bash
set -e

APP="/usr/local/lib/node_modules/vara-wallet/dist/app.js"

echo "=== Patching Buffer startsWith bug ==="
node << 'EOF'
const fs = require('fs');
const app = '/usr/local/lib/node_modules/vara-wallet/dist/app.js';
let src = fs.readFileSync(app, 'utf8');

// Add polyfill at top of file to make Buffer respond to startsWith
const polyfill = `
if(!Buffer.prototype.startsWith){Buffer.prototype.startsWith=function(p){return('0x'+this.toString('hex')).startsWith(p);};}
if(!Uint8Array.prototype.startsWith){Uint8Array.prototype.startsWith=function(p){return('0x'+Buffer.from(this).toString('hex')).startsWith(p);};}
`;

if (!src.includes('Buffer.prototype.startsWith')) {
  src = polyfill + src;
  fs.writeFileSync(app, src);
  console.log('Polyfill injected successfully');
} else {
  console.log('Polyfill already present');
}
EOF

echo "=== Uploading program ==="
vara-wallet --account jmadhan-mainnet --network mainnet --json \
  program upload /workspace/target/wasm32-unknown-unknown/release/varavault_program.wasm \
  --idl /workspace/varavault.idl \
  --init New --args "[]" 2>&1
