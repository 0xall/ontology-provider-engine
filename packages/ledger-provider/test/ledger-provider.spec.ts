import { Crypto, Parameter, ParameterType, RpcClient, utils } from 'ontology-ts-sdk';
import { OntologyProviderEngine } from '../../../providers';
import { LedgerSubProvider } from "../ledger-provider";
import { readFileSync } from 'fs';
import { join } from 'path';

const BigNumber = require('bignumber.js');
const chai = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .use(require('chai-match'));
const expect = chai.expect;
chai.should();

describe('Private Key Sub-Provider', () => {
  const client = new RpcClient('http://127.0.0.1:20336');
  let engine: OntologyProviderEngine;

  beforeEach(() => {
    engine = new OntologyProviderEngine();
    engine.addProvider(new LedgerSubProvider({
      accountIndex: 1, neoCompatible: true
    }));
    engine.start();
  });

  it ('should get public key', async () => {
    const publicKey = await engine.sendAsync('asset.getPublicKey');
    publicKey.should.be.match(/^[a-fA-F0-9]{66}$/g);
  });

  it ('should get account', async () => {
    const account = await engine.sendAsync('asset.getAccount');
    const publicKeyStr = await engine.sendAsync('asset.getPublicKey');
    const publicKey = Crypto.PublicKey.deserializeHex(new utils.StringReader(publicKeyStr));
    console.log(publicKeyStr, account);
    Crypto.Address.fromPubKey(publicKey).toBase58().should.be.equal(account);
  });

  it ('should sign message', async () => {
    const signMessage = 'sign this message!';
    const signature = await engine.sendAsync('message.signMessage', { message: utils.str2hexstr(signMessage) });

    console.log(signature.data, signature.publicKey);
    const publicKey = Crypto.PublicKey.deserializeHex(new utils.StringReader(signature.publicKey));
    console.log(publicKey.verify(utils.str2hexstr(signMessage), Crypto.Signature.deserializeHex('01' + signature.data)));
  });
});