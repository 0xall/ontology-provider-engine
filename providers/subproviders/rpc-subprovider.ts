import { OntologyProvider } from '../provider';
import { RpcClient, Crypto } from 'ontology-ts-sdk';
import { NetworkApi, NetworkType, Asset } from 'ontology-dapi';

export interface RpcSubProviderOptions {
  network?: NetworkType,
  connected?: () => Promise<boolean>,
}

export class RpcSubProvider extends OntologyProvider {
  rpcClient: RpcClient;
  rpcUrl: string;
  opts: RpcSubProviderOptions;

  constructor(rpcClient?: string | RpcClient, opts?: RpcSubProviderOptions) {
    super();

    this.opts = (opts) ? opts : {};

    // make ontology rpc client instance.
    if (typeof rpcClient === 'string') {
      this.rpcClient = new RpcClient(rpcClient);
    } else if (typeof rpcClient === 'undefined' || rpcClient === null) {
      this.rpcClient = new RpcClient();
    } else {
      this.rpcClient = rpcClient;
    }

    this.rpcUrl = this.rpcClient.url;

    // inject all rpc client APIs.
    this.api.network = <NetworkApi>Object.assign({}, {
      getNodeCount: () => this.rpcClient.getNodeCount(),
      getBlockHeight: () => this.rpcClient.getBlockHeight(),
      getMerkleProof: ({txHash}: { txHash: string }) => this.rpcClient.getMerkleProof(txHash),
      getStorage: ({contract, key}: { contract: string; key: string }) => this.rpcClient.getStorage(contract, key),
      getAllowance: ({asset, fromAddress, toAddress}: { asset: Asset; fromAddress: string; toAddress: string; }) =>
        this.rpcClient.getAllowance(asset, new Crypto.Address(fromAddress), new Crypto.Address(toAddress)),
      getBlock: ({block}: { block: number | string }) => this.rpcClient.getBlock(block),
      getTransaction: ({txHash}: { txHash: string }) => this.rpcClient.getRawTransactionJson(txHash),
      getNetwork: (this.opts.network) ? () =>
        Promise.resolve({type: this.opts.network, address: this.rpcUrl}) : undefined,
      getBalance: ({address}: { address: string }) => this.rpcClient.getBalance(new Crypto.Address(address)),
      isConnected: (this.opts.connected) ? this.opts.connected : undefined,
      getContract: ({hash}: { hash: string }) => this.rpcClient.getContractJson(hash),
      getSmartCodeEvent: ({value}: { value: string | number }) => this.rpcClient.getSmartCodeEvent(value),
      getBlockHeightByTxHash: ({hash}: { hash: string }) => this.rpcClient.getBlockHeightByTxHash(hash)
    })
  }

  public async afterCall(data: any) {
    return data.result;
  }
}