#!/bin/bash
# Polls balance every 15s until >= 5 VARA, then runs deploy.sh
ACCT="jmadhan-mainnet"
VARA_NETWORK="mainnet"
MIN=5000000000000
echo "Waiting for >= 5 VARA on $ACCT ..."
for i in $(seq 1 80); do
  RAW=$(vara-wallet --account "$ACCT" --network "$VARA_NETWORK" --json balance "" 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).balanceRaw)}catch(e){console.log('0')}})")
  echo "[$i] balanceRaw=$RAW"
  if [ -n "$RAW" ] && [ "$RAW" != "0" ] && [ "$RAW" -ge "$MIN" ] 2>/dev/null; then
    echo "FUNDED! Launching deploy..."
    bash /workspace/deploy.sh
    exit 0
  fi
  sleep 15
done
echo "Timed out after 20 min — check balance manually and run: bash /workspace/deploy.sh"
