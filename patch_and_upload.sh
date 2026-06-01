#!/bin/bash
set -e

WASM="/workspace/target/wasm32-unknown-unknown/release/varavault_program.wasm"
APP="/usr/local/lib/node_modules/vara-wallet/dist/app.js"

echo "=== Patching vara-wallet to fix Buffer->hex bug ==="
# The bug: program upload passes a Buffer as 'code', but @vara-eth/api expects hex string
# Find the readFileSync call that reads the WASM and hex-encode it
node << 'PATCH'
const fs = require('fs');
const path = '/usr/local/lib/node_modules/vara-wallet/dist/app.js';
let src = fs.readFileSync(path, 'utf8');

// Find where wasm file is read: typically fs.readFileSync(wasm) or readFile
// Patch: wrap any Buffer passed to program.upload as hex
// Strategy: find `program.upload({` and ensure code is hex
const before = src.length;

// Patch: convert Buffer code to hex string before upload
src = src.replace(
  /const\s+(\w+)\s*=\s*(?:node_)?fs(?:\w*)\.readFileSync\(wasm\)/,
  'const $1 = (()=>{const b=require("fs").readFileSync(wasm);return b instanceof Buffer?"0x"+b.toString("hex"):b;})()'
);

if (src.length === before) {
  // Try alternate pattern
  src = src.replace(
    /readFileSync\(wasm\)/g,
    'readFileSync(wasm)) && false || (()=>{const __b=require("fs").readFileSync(wasm);return __b instanceof Buffer?"0x"+__b.toString("hex"):__b;})()'
  );
}

// Simpler targeted patch: before program.upload call, ensure code is string
src = src.replace(
  /(program\.upload\(\{[^}]*code\s*:)\s*(\w+)(\s*[,}])/g,
  '$1 (typeof $2==="string"?$2:"0x"+Buffer.from($2).toString("hex"))$3'
);

fs.writeFileSync(path, src);
console.log('Patch applied');
PATCH

echo "=== Running upload ==="
vara-wallet --account jmadhan-mainnet --network mainnet --json \
  program upload "$WASM" \
  --idl /workspace/varavault.idl \
  --init New --args "[]" 2>&1
