
import {
  Crypto,
  OntAssetTxBuilder,
  TransactionBuilder,
  Oep4,
  WebsocketClient,
  RpcClient,
  RestClient,
  utils
} from 'ontology-ts-sdk';
import { WalletSubProvider, WalletSubProviderOptions } from "./wallet-subprovider";
import { Asset, Signature, Parameter, Response } from "ontology-dapi";


export interface PrivateKeySubProviderOptions extends WalletSubProviderOptions {
  client: RpcClient | WebsocketClient | RestClient;
  privateKey: (() => Promise<string | Crypto.PrivateKey>) | string | Crypto.PrivateKey;
  gasPrice?: (() => Promise<string>) | string;
  gasLimit?: (() => Promise<string>) | string;

  beforeGetAccount?: (address: string) => Promise<void>;
  beforeGetPublicKey?: (publicKey: string) => Promise<void>;
  beforeSend?: ({ from, to, asset, amount }: {
    from: string, to: string, asset: Asset, amount: string }
    ) => Promise<void>;
  beforeSignMessage?: (signature: Signature) => Promise<void>;
  beforeSignMessageHash?: (signature: Signature) => Promise<void>;
  beforeInvoke?: (txHex: string) => Promise<void>;
  beforeInvokeRead?: (txHex: string) => Promise<void>;
  beforeDeploy?: (txHex: string) => Promise<void>;
}

export class PrivateKeySubProvider extends WalletSubProvider {
  opts: PrivateKeySubProviderOptions;

  constructor(opts: PrivateKeySubProviderOptions) {
    super();

    this.opts = Object.assign({}, opts);
    this.opts.gasPrice = opts.gasPrice || '500';
    this.opts.gasLimit = opts.gasLimit || '20000';

    if (typeof this.opts.privateKey === 'string') {
      this.opts.privateKey = new Crypto.PrivateKey(this.opts.privateKey);
    }

    this.api.asset.getAccount = this.opts.getAccount || (() => this.getAccount());
    this.api.asset.getPublicKey = this.opts.getPublicKey || (() => this.getPublicKey());
    this.api.asset.send = this.opts.send || ((args) => this.send(args));
    this.api.message.signMessage = this.opts.signMessage || ((args) => this.signMessage(args));
    this.api.message.signMessageHash = this.opts.signMessageHash || ((args) => this.signMessageHash(args));
    this.api.smartContract.invoke = this.opts.invoke || ((args) => this.invoke(args));
    this.api.smartContract.invokeRead = this.opts.invokeRead || ((args) => this.invokeRead(args));
    this.api.smartContract.deploy = this.opts.deploy || ((args) => this.deploy(args));
  }

  /**
   * Returns the private key from the outside function.
   */
  protected async getPrivateKey(): Promise<Crypto.PrivateKey> {
    let privateKey;

    if (this.opts.privateKey instanceof Crypto.PrivateKey) {
      privateKey = this.opts.privateKey;
    } else if (this.opts.privateKey instanceof Function) {
      // if private key is callable, get private key by calling it.
      privateKey = await this.opts.privateKey();
    }

    // if no private key, reject with `NO_ACCOUNT`
    if (!privateKey) {
      throw new Error('NO_ACCOUNT');
    }

    try {
      // if private key is hex encoded string, convert it into PrivateKey instance.
      if (typeof privateKey === 'string') {
        return new Crypto.PrivateKey(privateKey);
      }

      return privateKey;
    } catch (e) {
      // if cannot parse private key, reject with `NO_ACCOUNT`
      throw new Error('NO_ACCOUNT');
    }
  }

  /**
   * Returns the account account base58 address.
   */
  public async getAccount(): Promise<string> {
    const privateKey = await this.getPrivateKey();
    const address = Crypto.Address.fromPubKey(privateKey.getPublicKey()).toBase58();

    if (this.opts.beforeGetAccount) {
      await this.opts.beforeGetAccount(address);
    }

    return address;
  }

  /**
   * Returns the public key of the account.
   */
  public async getPublicKey(): Promise<string> {
    const privateKey = await this.getPrivateKey();
    const publicKey = privateKey.getPublicKey().serializeHex();

    if (this.opts.beforeGetPublicKey) {
      await this.opts.beforeGetPublicKey(publicKey);
    }

    return publicKey;
  }

  /**
   * Transfers `asset` from the current address to `to` address with `amount`
   * @param to receiver address
   * @param asset token asset name (ONT, ONG) or token contract address
   * @param amount amount to send
   */
  public async send({ to, asset, amount }: { to: string, asset: Asset, amount: number }): Promise<string> {
    const privateKey = await this.getPrivateKey();
    const fromAddress = Crypto.Address.fromPubKey(privateKey.getPublicKey());
    let toAddress;

    // convert the `to` address into `Crypto.Address` instance.
    // if the `to` address is wrong format, reject with `MALFORMED_ACCOUNT`.
    try {
      toAddress = new Crypto.Address(to);
    } catch(e) {
      throw new Error('MALFORMED_ACCOUNT')
    }

    // get gas price and gas limit
    const gasPrice = (typeof this.opts.gasPrice === 'string') ? this.opts.gasPrice : await this.opts.gasPrice();
    const gasLimit = (typeof this.opts.gasLimit === 'string') ? this.opts.gasLimit : await this.opts.gasLimit();

    let tx;

    // if the asset is invalid, reject with `MALFORMED_ASSET`
    if (!asset) {
      throw new Error('MALFORMED_ASSET');
    }

    switch (asset) {
      // if the asset is ONT or ONG
      case 'ONT':
      case 'ONG':
        tx = OntAssetTxBuilder.makeTransferTx(asset, fromAddress, toAddress, amount, gasPrice, gasLimit);
        await TransactionBuilder.signTransactionAsync(tx, privateKey);
        break;

      // if the asset represents the OEP4 token contract address
      default:
        const tokenTxBuilder = new Oep4.Oep4TxBuilder(new Crypto.Address(asset));
        tx = tokenTxBuilder.makeTransferTx(fromAddress, toAddress, '' + amount, gasPrice, gasLimit, fromAddress);
        await TransactionBuilder.signTransactionAsync(tx, privateKey);
    }

    if (this.opts.beforeSend) {
      await this.opts.beforeSend(
        { from: fromAddress.toBase58(), to: toAddress.toBase58(), amount: '' + amount, asset }
        );
    }

    return await this.opts.client.sendRawTransaction(tx.serialize());
  }

  /**
   * Signs a message with the address private key.
   * @param message message to sign.
   */
  public async signMessage({ message }: { message: string }): Promise<Signature> {
    const privateKey = await this.getPrivateKey();
    const publicKey = privateKey.getPublicKey();
    const signature = await privateKey.signAsync(utils.str2hexstr(message));
    const sigData = <Signature>{
      publicKey: publicKey.serializeHex(),
      data: signature.serializeHex()
    };

    if (this.opts.beforeSignMessage) {
      await this.opts.beforeSignMessage(sigData)
    }

    return sigData;
  }

  /**
   * Signs a message hash with the address private key.
   *
   * @param messageHash hex encoded message hash
   */
  public async signMessageHash({ messageHash }: { messageHash: string }): Promise<Signature> {
    const privateKey = await this.getPrivateKey();
    const publicKey = privateKey.getPublicKey();
    const signature = await privateKey.signAsync(messageHash);
    const sigData = <Signature>{
      publicKey: publicKey.serializeHex(),
      data: signature.serializeHex()
    };

    if (this.opts.beforeSignMessageHash) {
      await this.opts.beforeSignMessageHash(sigData);
    }

    return sigData;
  }

  /**
   * Invoke a transaction.
   *
   * @param scriptHash contract vm code hash.
   * @param operation function name.
   * @param args function arguments.
   * @param gasPrice gas price in transaction.
   * @param gasLimit gas limit in transaction.
   * @param requireIdentity
   */
  public async invoke(
    { scriptHash, operation, args, gasPrice, gasLimit, requireIdentity }: {
      scriptHash: string,
      operation: string,
      args?: Parameter[],
      gasPrice?: number,
      gasLimit?: number,
      requireIdentity?: boolean
    }): Promise<Response> {
    const privateKey = await this.getPrivateKey();

    // get gas price and gas limit
    const _gasPrice = gasPrice || ((typeof this.opts.gasPrice === 'string') ? this.opts.gasPrice : await this.opts.gasPrice());
    const _gasLimit = gasLimit || ((typeof this.opts.gasLimit === 'string') ? this.opts.gasLimit : await this.opts.gasLimit());

    const tx = TransactionBuilder.makeInvokeTransaction(
      operation,
      <any>args,
      new Crypto.Address(utils.reverseHex(scriptHash)),
      '' + _gasPrice,
      '' + _gasLimit,
      Crypto.Address.fromPubKey(privateKey.getPublicKey())
    );

    await TransactionBuilder.signTransactionAsync(tx, privateKey);
    const serializedTx = tx.serialize();

    if (this.opts.beforeInvoke) {
      await this.opts.beforeInvoke(serializedTx);
    }

    const result = (await this.opts.client.sendRawTransaction(serializedTx)).result;

    if (result.match(/^[a-fA-F0-9]{64}$/g)) {
      return result;
    } else {
      throw new Error(result);
    }
  }

  /**
   * Returns the expected return value when a transaction called.
   *
   * @param scriptHash contract vm code hash.
   * @param operation function name.
   * @param args function arguments.
   */
  public async invokeRead({ scriptHash, operation, args }: {
    scriptHash: string; operation: string; args?: Parameter[];
  }): Promise<any> {
    const tx = TransactionBuilder.makeInvokeTransaction(
      operation,
      <any>args,
      new Crypto.Address(utils.reverseHex(scriptHash))
    );
    const serializedTx = tx.serialize();

    if (this.opts.beforeInvokeRead) {
      await this.opts.beforeInvokeRead(serializedTx);
    }

    const result = await this.opts.client.sendRawTransaction(serializedTx, true);
    return result.result.Result;
  }

  /**
   * Deploys a contract.
   *
   * @param code hex encoded vm code.
   * @param name contract name.
   * @param version contract version.
   * @param author contract author.
   * @param email contract email.
   * @param description contract description.
   * @param needStorage whether the contract needs storage or not.
   * @param gasPrice gas price in transaction.
   * @param gasLimit gas limit in transaction.
   */
  public async deploy({ code, name, version, author, email, description, needStorage, gasPrice, gasLimit } :
              { code: string; name?: string; version?: string; author?: string; email?: string;
                description?: string; needStorage?: boolean; gasPrice?: number; gasLimit?: number;
              }): Promise<void> {
    const privateKey = await this.getPrivateKey();

    // get gas price and gas limit. If not defined by parameter, use default gas price and limit.
    const _gasPrice = gasPrice || ((typeof this.opts.gasPrice === 'string') ?
      this.opts.gasPrice : await this.opts.gasPrice());
    const _gasLimit = gasLimit || ((typeof this.opts.gasLimit === 'string') ?
      this.opts.gasLimit : await this.opts.gasLimit());

    // generate transaction code
    const tx = TransactionBuilder.makeDeployCodeTransaction(
      code, name, version, author, email, description, needStorage, '' + _gasPrice, '' + _gasLimit,
      Crypto.Address.fromPubKey(privateKey.getPublicKey())
    );

    await TransactionBuilder.signTransactionAsync(tx, privateKey);
    const serializedTx = tx.serialize();

    if (this.opts.beforeDeploy) {
      await this.opts.beforeDeploy(serializedTx)
    }

    // send transaction and return the tx hash
    const result = (await this.opts.client.sendRawTransaction(serializedTx)).result;

    // if the result is transaction hash returns it and if not, throw error.
    if (result.match(/^[a-fA-F0-9]{64}$/g)) {
      return result;
    } else {
      throw new Error(result);
    }
  }
}