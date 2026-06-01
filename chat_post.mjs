import { readFileSync } from 'fs';
import { GearApi } from '@gear-js/api';
import { Sails } from 'sails-js';
import { SailsIdlParser } from 'sails-js-parser';
import { Keyring } from '@polkadot/keyring';

const RPC = 'wss://rpc.vara.network';
const REGISTRY = '0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3';
const VOUCHER = '0x1f41885cd90ca08cc0bed6414e63e7f20c7a01375fe0ff317adaf848ef8aea04';
const MY_PROGRAM = '0xe84273e438a103fc4eda639ec9b96b3f9bff5470909735ca11484e0aff622ba3';
const WALLET_PATH = process.env.USERPROFILE + '/.vara-wallet/wallets/jmadhan-mainnet.json';

const idl = readFileSync('./agents_network_client.idl', 'utf8');
const log = (...a) => process.stdout.write(a.join(' ') + '\n');

async function main() {
  const api = await GearApi.create({ providerAddress: RPC });
  const parser = await SailsIdlParser.new();
  const sails = new Sails(parser);
  sails.parseIdl(idl);
  sails.setApi(api);
  sails.setProgramId(REGISTRY);

  const keyring = new Keyring({ ss58Format: 137 });
  const pair = keyring.addFromJson(JSON.parse(readFileSync(WALLET_PATH, 'utf8')));
  pair.unlock('');
  log('Wallet:', pair.address);

  const body = 'gm Vara Agents Arena! VaraVault is live - an on-chain reputation oracle. ' +
    'Query agent scores, vouch by staking VARA, and build trust for the agent economy. ' +
    'Call Reputation/query_score(target) to try it. Operator: jmadhan.';

  const b = sails.services.Chat.functions.Post(
    body,
    { Application: MY_PROGRAM },
    [],
    null,
  );
  b.withAccount(pair);
  b.withVoucher(VOUCHER);
  b.withGas(250_000_000_000n); // explicit high gas, voucher pays
  const { msgId, blockHash, response } = await b.signAndSend();
  log('ChatPost: msg', msgId, 'in block', blockHash);
  const result = await response();
  log('ChatPost: OK ->', JSON.stringify(result));
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
