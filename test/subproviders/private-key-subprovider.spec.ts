import { Crypto, Parameter, ParameterType, RpcClient, utils } from 'ontology-ts-sdk';
import { OntologyProviderEngine, PrivateKeySubProvider } from '../../providers';
import { waitForTransactionReceipt } from "../utils/transaction";
import { readFileSync } from 'fs';
import { join } from 'path';

const BigNumber = require('bignumber.js');
const chai = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .use(require('chai-match'));
const expect = chai.expect;
chai.should();

const config = require('../config.json');

describe('Private Key Sub-Provider', () => {
  const client = new RpcClient('http://127.0.0.1:20336');
  const privateKey = new Crypto.PrivateKey(config.privateKey);
  let engine: OntologyProviderEngine;
  const avm = readFileSync(join(__dirname, '..', 'contracts', 'oep4-token.avm')).toString();
  const contractHash = Crypto.Address.fromVmCode(avm);

  beforeEach(() => {
    engine = new OntologyProviderEngine();
    engine.addProvider(new PrivateKeySubProvider({ client, privateKey }));
    engine.start();
  });

  it ('should get account', async () => {
    const account = await engine.sendAsync('asset.getAccount');
    account.should.be.equal(config.address);
  });

  it ('should get public key', async () => {
    const publicKey = await engine.sendAsync('asset.getPublicKey');
    privateKey.getPublicKey().serializeHex().should.be.equal(publicKey);
  });

  it ('should send ONT', async () => {
    const beforeBalanceONT = new BigNumber(
      (await client.getBalance(new Crypto.Address(config.address)))['result']['ont']
    );

    const tx = await engine.sendAsync('asset.send', {
      to: config.others[0],
      amount: 10,
      asset: 'ONT'
    });

    await waitForTransactionReceipt(client, tx.result);

    const afterBalanceONT = new BigNumber(
      (await client.getBalance(new Crypto.Address(config.address)))['result']['ont']
    );

    afterBalanceONT.should.be.bignumber.equal(beforeBalanceONT.minus(10));
  });

  it ('should send ONG', async () => {
    const beforeBalanceONT = new BigNumber(
      (await client.getBalance(new Crypto.Address(config.address)))['result']['ong']
    );

    const tx = await engine.sendAsync('asset.send', {
      to: config.others[0],
      amount: '10',
      asset: 'ONG'
    });

    await waitForTransactionReceipt(client, tx.result);

    const afterBalanceONT = new BigNumber(
      (await client.getBalance(new Crypto.Address(config.address)))['result']['ong']
    );

    // 10 ONG + gas price
    afterBalanceONT.should.be.bignumber.equal(beforeBalanceONT.minus(10 + 20000 * 500));
  });

  it ('should sign message', async () => {
    const message = 'hello, world!';
    const signature = await engine.sendAsync('message.signMessage', { message });

    console.log(signature);
    signature.publicKey.should.be.equal(privateKey.getPublicKey().serializeHex());
    privateKey.getPublicKey().verify(
      utils.str2hexstr(message), Crypto.Signature.deserializeHex(signature.data)
    ).should.be.equal(true);
  });

  it ('should sign message hash', async () => {
    const messageHash = utils.sha256('hello, world!');
    const signature = await engine.sendAsync('message.signMessageHash', { messageHash });

    signature.publicKey.should.be.equal(privateKey.getPublicKey().serializeHex());
    privateKey.getPublicKey().verify(
      messageHash, Crypto.Signature.deserializeHex(signature.data)
    ).should.be.equal(true);
  });

  it ('should deploy smart contract', async () => {
    const txHash = await engine.sendAsync('smartContract.deploy', {
      code: avm,
      gasLimit: 20400000
    });

    // the result should be transaction hash with 64 bytes.
    expect(txHash).to.match(/^[a-fA-F0-9]{64}$/g);

    // after mined, get the receipt
    const receipt = await waitForTransactionReceipt(client, txHash);

    receipt.result.Payload.Code.should.be.equal(avm);
  });

  it ('should invoke transaction', async () => {
    const scriptHash = contractHash.toHexString();
    const operation = 'init';
    const txHash = await engine.sendAsync('smartContract.invoke', { scriptHash, operation, args: [] });

    // the result should be transaction hash with 64 bytes.
    expect(txHash).to.match(/^[a-fA-F0-9]{64}$/g);

    // after mined, get the receipt
    const receipt = await waitForTransactionReceipt(client, txHash);
  });

  it ('should pre-execute transaction and get result', async () => {
    const scriptHash = contractHash.toHexString();
    const operation = 'balanceOf';
    const args: Parameter[] = [
      new Parameter('account', ParameterType.ByteArray, new Crypto.Address('AQf4Mzu1YJrhz9f3aRkkwSm9n3qhXGSh4p').serialize())
    ];

    const balanceOf = new BigNumber(
      utils.reverseHex(
        await engine.sendAsync('smartContract.invokeRead', { scriptHash, operation, args })
      ), 16
    );

    balanceOf.should.be.bignumber.equal(1e17);
  });

  it ('should execute before getAccount function', async () => {
    let called = false;
    engine = new OntologyProviderEngine();
    engine.addProvider(new PrivateKeySubProvider({
      client,
      privateKey,
      beforeGetAccount: async () => {
        called = true;
      }
    }));
    engine.start();

    await engine.sendAsync('asset.getAccount');
    called.should.be.equal(true);
  });

  it ('should execute before getPublicKey function', async () => {
    let called = false;
    engine = new OntologyProviderEngine();
    engine.addProvider(new PrivateKeySubProvider({
      client,
      privateKey,
      beforeGetPublicKey: async () => {
        called = true;
      }
    }));
    engine.start();

    await engine.sendAsync('asset.getPublicKey');
    called.should.be.equal(true);
  });

  it ('should execute before signMessage function', async () => {
    let called = false;
    engine = new OntologyProviderEngine();
    engine.addProvider(new PrivateKeySubProvider({
      client,
      privateKey,
      beforeSignMessage: async () => {
        called = true;
      }
    }));
    engine.start();

    await engine.sendAsync('message.signMessage', { message: '' });
    called.should.be.equal(true);
  });

  it ('should execute before signMessageHash function', async () => {
    let called = false;
    engine = new OntologyProviderEngine();
    engine.addProvider(new PrivateKeySubProvider({
      client,
      privateKey,
      beforeSignMessageHash: async () => {
        called = true;
      }
    }));
    engine.start();

    await engine.sendAsync('message.signMessageHash', {
      messageHash: utils.sha256('test')
    });
    called.should.be.equal(true);
  });
});