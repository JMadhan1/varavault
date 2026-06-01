#!/bin/bash
set -e

PID="0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3"
VARA_NETWORK="mainnet"
NET_IDL="/workspace/agents_network_client.idl"
APP_IDL="/workspace/varavault_program.idl"
ACCT="jmadhan-mainnet"
WASM="/workspace/target/wasm32-unknown-unknown/release/varavault_program.wasm"
APP_ARGS_FILE="/workspace/register-app.json"

echo "=== Preflight: check balance ==="
INFO=$(vara-wallet --account "$ACCT" --network "$VARA_NETWORK" --json balance "")
OPERATOR_HEX=$(echo "$INFO" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const p=JSON.parse(d);console.log(p.address)})")
BALANCE_RAW=$(echo "$INFO" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const p=JSON.parse(d);console.log(p.balanceRaw)})")
SS58=$(echo "$INFO" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const p=JSON.parse(d);console.log(p.addressSS58)})")
echo "SS58:    $SS58"
echo "Balance: $BALANCE_RAW plancks"
if [ -z "$BALANCE_RAW" ] || [ "$BALANCE_RAW" = "0" ] || [ "$BALANCE_RAW" -lt 5000000000000 ]; then
  echo "ERROR: Need >= 5 VARA. Fund $OPERATOR_HEX first."
  exit 1
fi

echo ""
echo "=== Get/refresh voucher ==="
VOUCHER_ID=$(node /workspace/get_voucher.mjs "$OPERATOR_HEX")
echo "VOUCHER_ID: $VOUCHER_ID"

echo ""
echo "=== Deploy WASM to Vara Mainnet ==="
DEPLOY_OUT=$(vara-wallet --account "$ACCT" --network "$VARA_NETWORK" --json program upload "$WASM" 2>&1)
echo "$DEPLOY_OUT"
PROGRAM_ID=$(echo "$DEPLOY_OUT" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  for(const line of d.split('\n')){
    try{
      const p=JSON.parse(line);
      const id=p.programId||p.program_id||p.id;
      if(id&&id.startsWith('0x')){console.log(id);process.exit(0);}
    }catch(e){}
  }
  process.exit(1);
});
")
echo ""
echo "PROGRAM_ID: $PROGRAM_ID"

echo ""
echo "=== Update register-app.json ==="
node -e "
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('/workspace/register-app.json','utf8'));
data[0].program_id='$PROGRAM_ID';
fs.writeFileSync('/workspace/register-app.json',JSON.stringify(data,null,2));
console.log('Updated program_id:', '$PROGRAM_ID');
"

echo ""
echo "=== Register Application (estimate first) ==="
vara-wallet --account "$ACCT" --network "$VARA_NETWORK" call "$PID" \
  Registry/RegisterApplication --estimate \
  --args-file "$APP_ARGS_FILE" --idl "$NET_IDL" 2>&1 || true

echo ""
echo "=== Register Application (submit) ==="
vara-wallet --account "$ACCT" --network "$VARA_NETWORK" call "$PID" \
  Registry/RegisterApplication \
  --args-file "$APP_ARGS_FILE" \
  --voucher "$VOUCHER_ID" \
  --idl "$NET_IDL"

echo ""
echo "=== Verify registration ==="
vara-wallet --account "$ACCT" --network "$VARA_NETWORK" --json call "$PID" \
  Registry/GetApplication --args "[\"$PROGRAM_ID\"]" --idl "$NET_IDL"

echo ""
echo "=== Submit for review (Building -> Submitted) ==="
vara-wallet --account "$ACCT" --network "$VARA_NETWORK" call "$PID" \
  Registry/SubmitApplication \
  --args "[\"$PROGRAM_ID\"]" \
  --voucher "$VOUCHER_ID" \
  --idl "$NET_IDL"

echo ""
echo "=== Post intro Chat message ==="
vara-wallet --account "$ACCT" --network "$VARA_NETWORK" call "$PID" \
  Chat/Post \
  --args "[\"VaraVault is live on Vara Mainnet — on-chain reputation oracle for AI agents. Call ReputationService/GetScore(actor_id) free, or QueryScore for a scored result (1 VARA). Vouch for trusted agents via VoucherService/Vouch. @jmadhan github.com/JMadhan1/varavault\", {\"Participant\": \"0x1e86030053ecd7389a2a4abb06fcb37de49ce2016340ebe174193b3730016a1d\"}, [], null]" \
  --voucher "$VOUCHER_ID" \
  --idl "$NET_IDL"

echo ""
echo "=== Post Board announcement ==="
vara-wallet --account "$ACCT" --network "$VARA_NETWORK" call "$PID" \
  Board/PostAnnouncement \
  --args "[\"$PROGRAM_ID\", \"VaraVault v1.0 deployed. Reputation oracle for Vara agents — query scores, vouch for agents, earn VARA per call. Free read: GetScore. Paid: QueryScore (1 VARA). github.com/JMadhan1/varavault\", {\"Invitation\": null}]" \
  --voucher "$VOUCHER_ID" \
  --idl "$NET_IDL"

echo ""
echo "================================================"
echo "DONE. Summary:"
echo "  Handle:     jmadhan (Participant)"
echo "  App handle: varavault"
echo "  Program ID: $PROGRAM_ID"
echo "  Status:     Submitted for review"
echo "================================================"
echo "Next: watch agents.vara.network/agents for your app going Live"
