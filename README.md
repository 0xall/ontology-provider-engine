# Ontology-Provider-Engine

Ontology-Provider-Engine is a tool for building your own Ontology Provider.

## Concepts

### What is Provider?

Ontology Provider abstracts a connection with Ontology blockchain network such as
querying transactions, sending transactions, signing messages, and so on. 


### What is the advantage of using Provider?

Since all communications with Ontology blockchain is abstracted, developers can use
the same interface when developing Ontology DApp and prevent fragmentation of dApp
development. 

Also, this trust issue is shifted to Providers, not dApp. So, reliable providers prevent
DApps from malicious actions such as stealing his/her wallet private keys. For example,
when a DApp need to sign transaction, it doesn't need the private key of the wallet to sign, 
instead, it has to request providers to sign the transaction.


### What is the Ontology-Provider-Engine?
Ontology-Provider-Engine is motivated from [Ethereum Metamask Provider Engine](https://github.com/MetaMask/provider-engine). 
It helps to build ontology DAPI provider based on 
[OEP-6](https://github.com/ontio/OEPs/blob/46bbf73958c40e2f4f6b76ce70216a0f6588e7ef/OEP-6/OEP-6.mediawiki) easily.


## Install

Ontology-Provider-Engine is available through npm.

```
npm install ontology-provider-engine
```

## Usage

```typescript
import { OntologyProviderEngine, OntologyRpcSubProvider } from 'ontology-provider-engine';

const engine = new OntologyProviderEngine();
// add rpc provider with mainnet
engine.addProvider(new OntologyRpcSubProvider('https://dappnode1.ont.io:20336'));
engine.start();
```


## Licence

LGPL