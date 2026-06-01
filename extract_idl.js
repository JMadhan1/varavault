const fs = require('fs');
const path = require('path');

const wasmPath = path.join(__dirname, 'target', 'wasm32-unknown-unknown', 'release', 'varavault_program.wasm');
const buf = fs.readFileSync(wasmPath);

// List all exported function names from the wasm export section (id=7)
let offset = 8;
while (offset < buf.length) {
  const sectionId = buf[offset];
  offset += 1;
  let size = 0, shift = 0, b;
  do { b = buf[offset++]; size |= (b & 0x7f) << shift; shift += 7; } while (b & 0x80);
  const sectionEnd = offset + size;

  if (sectionId === 7) { // export section
    let count = 0, cshift = 0, cb;
    do { cb = buf[offset++]; count |= (cb & 0x7f) << cshift; cshift += 7; } while (cb & 0x80);
    console.log(`Exports (${count}):`);
    for (let i = 0; i < count; i++) {
      let nlen = 0, ns = 0, nb;
      do { nb = buf[offset++]; nlen |= (nb & 0x7f) << ns; ns += 7; } while (nb & 0x80);
      const name = buf.slice(offset, offset + nlen).toString('utf8');
      offset += nlen;
      const kind = buf[offset++];
      let idx = 0, is2 = 0, ib;
      do { ib = buf[offset++]; idx |= (ib & 0x7f) << is2; is2 += 7; } while (ib & 0x80);
      console.log(`  [${kind === 0 ? 'func' : kind === 1 ? 'table' : kind === 2 ? 'mem' : 'global'}] ${name}`);
    }
  }
  offset = sectionEnd;
}
