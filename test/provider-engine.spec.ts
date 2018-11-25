
import { OntologyProviderEngine, RpcSubProvider } from "../providers";
import { Provider } from 'ontology-dapi';

const chai = require('chai').use(require('chai-as-promised'));
chai.should();

describe('Provider Engine', () => {
  let engine: OntologyProviderEngine;

  beforeEach(() => {
    engine = new OntologyProviderEngine({
      providerInfo: {
        name: 'provider-test',
        version: '1.0',
        compatibility: ['OEP-6']
      }
    });
    engine.start();
  });

  it ('should reject if not-supported request comes', () => {
    chai.expect(engine.sendAsync('network.getBlockHeight')).to.be.rejectedWith(Error);
  });

  it ('should not reject if supported request comes', () => {
    engine.addProvider(new RpcSubProvider());
    chai.expect(engine.sendAsync('network.getBlockHeight')).not.to.be.rejectedWith(Error);
  });

  it ('should get provider info', async () => {
    const providerInfo: Provider = await engine.sendAsync('provider.getProvider');

    providerInfo.name.should.be.equal('provider-test');
    providerInfo.version.should.be.equal('1.0');
    providerInfo.compatibility.length.should.be.equal(1);
    providerInfo.compatibility[0].should.be.equal('OEP-6');
  });
});