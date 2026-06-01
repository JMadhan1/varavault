#!/bin/bash
set -e

PID="0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3"
VOUCHER_URL="https://voucher-backend-agents.vara.network/voucher"
VARA_NETWORK="mainnet"
IDL="/workspace/agents_network_client.idl"
ACCT="jmadhan-mainnet"
PARTICIPANT_HANDLE="jmadhan"
GITHUB_URL="https://github.com/JMadhan1/varavault"

echo "=== Step 1: Check handle availability ==="
RESULT=$(vara-wallet --network "$VARA_NETWORK" --json call "$PID" \
  Registry/ResolveHandle \
  --args "[\"$PARTICIPANT_HANDLE\"]" \
  --idl "$IDL" 2>&1)
echo "ResolveHandle result: $RESULT"
TAKEN=$(echo "$RESULT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const p=JSON.parse(d);console.log(p.result||'null')}catch(e){console.log('parse-error')}})")
echo "Taken: $TAKEN"
if [ "$TAKEN" != "null" ] && [ "$TAKEN" != "" ] && [ "$TAKEN" != "parse-error" ]; then
  echo "WARN: handle '$PARTICIPANT_HANDLE' may be taken: $TAKEN"
fi

echo ""
echo "=== Step 2: Create wallet ==="
if vara-wallet --account "$ACCT" --network "$VARA_NETWORK" --json balance "" > /dev/null 2>&1; then
  echo "Wallet '$ACCT' already exists"
else
  vara-wallet wallet create --name "$ACCT" --no-encrypt
fi

echo ""
echo "=== Step 2b: Get wallet hex ==="
INFO=$(vara-wallet --account "$ACCT" --network "$VARA_NETWORK" --json balance "")
OPERATOR_HEX=$(echo "$INFO" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const p=JSON.parse(d);console.log(p.address)})")
SS58=$(echo "$INFO" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const p=JSON.parse(d);console.log(p.addressSS58)})")
echo "SS58:         $SS58"
echo "OPERATOR_HEX: $OPERATOR_HEX"

echo ""
echo "=== Step 3: Get gas voucher ==="
VOUCHER_ID=$(node /workspace/get_voucher.mjs "$OPERATOR_HEX")
echo "VOUCHER_ID: $VOUCHER_ID"

echo ""
echo "=== Step 4: Register Participant ==="
vara-wallet --account "$ACCT" --network "$VARA_NETWORK" call "$PID" \
  Registry/RegisterParticipant \
  --args "[\"$PARTICIPANT_HANDLE\", \"$GITHUB_URL\"]" \
  --voucher "$VOUCHER_ID" \
  --idl "$IDL"

echo ""
echo "=== DONE ==="
echo "Handle '$PARTICIPANT_HANDLE' registered."
echo "SS58:  $SS58"
echo "HEX:   $OPERATOR_HEX"
echo "Next: post X tweet tagging @VaraNetwork to claim 100 VARA"
