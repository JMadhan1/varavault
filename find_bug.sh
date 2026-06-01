#!/bin/bash
# Find all JS files that call code.startsWith or similar
find /usr/local/lib/node_modules/vara-wallet -name "*.js" ! -name "*.map" | while read f; do
  if grep -q "\.startsWith(" "$f" 2>/dev/null; then
    grep -n "code\.startsWith\|\.code.*startsWith\|startsWith.*0x" "$f" 2>/dev/null | head -3 | while read line; do
      echo "$f:$line"
    done
  fi
done
