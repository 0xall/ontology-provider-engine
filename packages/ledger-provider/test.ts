
import { OntLedger } from "./ont-ledger";
import { Crypto, utils } from 'ontology-ts-sdk';
import * as elliptic from 'elliptic';

async function test() {
  const ledger = await OntLedger.init();

  console.log(await ledger.getAddress(0, false));
  console.log(await ledger.getSignature('1234', 0, false));

  // const publicKeyStr = await ledger.getPublicKey(0, false);
  // console.log(publicKeyStr);
  //
  // const privateKey = new Crypto.PrivateKey('', Crypto.KeyType.ECDSA, new Crypto.KeyParameters(Crypto.CurveLabel.SECP256R1));
  // // const publicKey = new Crypto.PublicKey(publicKeyStr, privateKey.algorithm, privateKey.parameters);
  // const ec = new elliptic.ec(Crypto.CurveLabel.SECP256R1.preset);
  // const keypair = ec.keyFromPublic(Buffer.from(publicKeyStr, 'hex'), 'hex');
  // const compressed = keypair.getPublic(true, 'hex');
  // console.log(compressed);
  //
  // console.log(Crypto.Address.fromPubKey(new Crypto.PublicKey(compressed)).toBase58());
}

test();