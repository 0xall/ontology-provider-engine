import { OntologyProvider } from '../provider';
import { RestClient, Crypto } from 'ontology-ts-sdk';
import { NetworkApi, NetworkType, Asset } from 'ontology-dapi';

export interface RestSubProviderOptions {
  network?: NetworkType,
  connected?: () => Promise<boolean>,
}

export class RestSubProvider extends OntologyProvider {
  client: RestClient;
  rpcUrl: string;
  opts: RestSubProviderOptions;

  constructor(restClient?: string | RestClient, opts?: RestSubProviderOptions) {
    super();

    this.opts = (opts) ? opts : {};

    // make ontology rpc client instance.
    if (typeof restClient === 'string') {
      this.client = new RestClient(restClient);
    } else if (typeof restClient === 'undefined' || restClient === null) {
      this.client = new RestClient();
    } else {
      this.client = restClient;
    }

    this.rpcUrl = this.client.url;

    // inject all rpc client APIs.
    this.api.network = <NetworkApi>Object.assign({}, {
      getNodeCount: () => this.client.getNodeCount(),
      getBlockHeight: () => this.client.getBlockHeight(),
      getMerkleProof: ({txHash}: { txHash: string }) => this.client.getMerkleProof(txHash),
      getStorage: ({contract, key}: { contract: string; key: string }) => this.client.getStorage(contract, key),
      getAllowance: ({asset, fromAddress, toAddress}: { asset: Asset; fromAddress: string; toAddress: string; }) =>
        this.client.getAllowance(asset, new Crypto.Address(fromAddress), new Crypto.Address(toAddress)),
      getBlock: ({block}: { block: number | string }) => this.client.getBlock(block),
      getTransaction: ({txHash}: { txHash: string }) => this.client.getRawTransactionJson(txHash),
      getNetwork: (this.opts.network) ? () =>
        Promise.resolve({type: this.opts.network, address: this.rpcUrl}) : undefined,
      getBalance: ({address}: { address: string }) => this.client.getBalance(new Crypto.Address(address)),
      isConnected: (this.opts.connected) ? this.opts.connected : undefined,
      getContract: ({hash}: { hash: string }) => this.client.getContractJson(hash),
      getSmartCodeEvent: ({value}: { value: string | number }) => this.client.getSmartCodeEvent(value),
      getBlockHeightByTxHash: ({hash}: { hash: string }) => this.client.getBlockHeightByTxHash(hash)
    })
  }
}