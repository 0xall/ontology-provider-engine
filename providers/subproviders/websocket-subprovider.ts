import { OntologyProvider } from '../provider';
import { WebsocketClient, Crypto } from 'ontology-ts-sdk';
import { NetworkApi, NetworkType, Asset } from 'ontology-dapi';

export interface WebsocketSubProviderOptions {
  network?: NetworkType,
  connected?: () => Promise<boolean>,
}

export class WebsocketSubProvider extends OntologyProvider {
  client: WebsocketClient;
  clientUrl: string;
  opts: WebsocketSubProviderOptions;

  constructor(webSocketClient?: string | WebsocketClient, opts?: WebsocketSubProviderOptions) {
    super();

    this.opts = (opts) ? opts : {};

    // make ontology web socket client instance.
    if (typeof webSocketClient === 'string') {
      this.clientUrl = webSocketClient;
      this.client = new WebsocketClient(webSocketClient);
    } else if (typeof webSocketClient === 'undefined' || webSocketClient === null) {
      this.client = new WebsocketClient();
    } else {
      this.client = webSocketClient;
    }

    // inject all API supports in RPC Client
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
        Promise.resolve({type: this.opts.network, address: this.clientUrl}) : undefined,
      getBalance: ({address}: { address: string }) => this.client.getBalance(new Crypto.Address(address)),
      isConnected: (this.opts.connected) ? this.opts.connected : undefined,
      getContract: ({hash}: { hash: string }) => this.client.getContractJson(hash),
      getSmartCodeEvent: ({value}: { value: string | number }) => this.client.getSmartCodeEvent(value),
      getBlockHeightByTxHash: ({hash}: { hash: string }) => this.client.getBlockHeightByTxHash(hash),
      getUnboundOng: ({ address }: { address: string }) => this.client.getUnboundong(new Crypto.Address(address)),
      getBlockHash: ({ height }: { height: number }) => this.client.getBlockHash(height),
      getBlockTxsByHeight: ({ height }: { height: number }) => this.client.getBlockTxsByHeight(height),
      getGasPrice: () => this.client.getGasPrice(),
      getGrantOng: ({ address }: { address: string }) => this.client.getGrantOng(new Crypto.Address(address)),
      getMempoolTxCount: () => this.client.getMempoolTxCount(),
      getMempoolTxState: ({ hash }: { hash: string }) => this.client.getMempoolTxState(hash),
      getVersion: () => this.client.getVersion()
    })
  }
}