
import { RpcClient, Crypto, utils } from 'ontology-ts-sdk';
import { OntologyProviderEngine, PrivateKeySubProvider, VerifierSubProvider } from '../../providers';

const config = require('../config.json');
const chai = require('chai');
chai.should();

describe('Verifier sub-provider', () => {
  const client = new RpcClient('http://127.0.0.1:20336');
  const privateKey = new Crypto.PrivateKey(config.privateKey);
  let engine: OntologyProviderEngine;

  const sigMessage = 'sign this message!';
  const signature = privateKey.sign(utils.str2hexstr(sigMessage));

  beforeEach(() => {
    engine = new OntologyProviderEngine();
    engine.addProvider(new PrivateKeySubProvider({ client, privateKey }));
    engine.addProvider(new VerifierSubProvider());
    engine.start();
  });

  it ('should verify message and signature', async () => {
    const result = await engine.sendAsync('message.verifyMessage', {
      message: sigMessage,
      signature: { data: signature.serializeHex(), publicKey: privateKey.getPublicKey().serializeHex() }
    });

    result.should.be.equal(true);
  });

  it ('should verify message hash and signature', async () => {
    const messageHash = utils.sha256(sigMessage);
    const signature = privateKey.sign(messageHash);

    const result = await engine.sendAsync('message.verifyMessageHash', {
      messageHash: messageHash,
      signature: { data: signature.serializeHex(), publicKey: privateKey.getPublicKey().serializeHex() }
    });

    result.should.be.equal(true);
  });
});