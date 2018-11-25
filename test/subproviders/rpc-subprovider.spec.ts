
import { OntologyProviderEngine, RpcSubProvider } from "../../providers";
const chai = require('chai').use(require('chai-as-promised'));
chai.should();

describe('RPC Sub-Provider', () => {
  let engine: OntologyProviderEngine;

  beforeEach(() => {
    engine = new OntologyProviderEngine();

    // add rpc provider with main network.
    engine.addProvider(new RpcSubProvider('http://dappnode1.ont.io:20336'));
    engine.start();
  });

  it ('should get block height', async () => {
    const blockHeight = parseInt(await engine.sendAsync('network.getBlockHeight'));
    blockHeight.should.be.greaterThan(1000000);
  });
});