
import { OntologyProvider } from '../provider';
import { Asset, Signature, Parameter, Response } from 'ontology-dapi';

export interface WalletSubProviderOptions {
  getAccount?: () => Promise<string>;
  getPublicKey?: () => Promise<string>;
  send?: ({ to, asset, amount }: { to: string, asset: Asset, amount: number }) => Promise<string>;

  signMessageHash?: ({ messageHash }: { messageHash: string }) => Promise<Signature>;
  signMessage?: ({ message }: { message: string }) => Promise<Signature>;

  invoke?: ({ scriptHash, operation, args, gasPrice, gasLimit, requireIdentity }:
           { scriptHash: string, operation: string, args?: Parameter[],
             gasPrice?: number, gasLimit?: number, requireIdentity?: boolean
           }) => Promise<Response>;

  invokeRead?: ({ scriptHash, operation, args }:
                  { scriptHash: string; operation: string; args?: Parameter[]; }) => Promise<any>;

  deploy?: ({ code, name, version, author, email, description, needStorage, gasPrice, gasLimit } :
              { code: string; name?: string; version?: string; author?: string; email?: string;
                description?: string; needStorage?: boolean; gasPrice?: number; gasLimit?: number;
              }) => Promise<void>;
}

export class WalletSubProvider extends OntologyProvider {
  opts: any;

  constructor(opts?: WalletSubProviderOptions) {
    super();

    this.opts = (opts) ? opts : {};

    const callOrReject = (func: any, errorMsg: any) => {
      return async () => {
        if (func) {
          const result = await func();
          if (!result) throw new Error(errorMsg);
          else return result;
        } else {
          throw new Error(errorMsg);
        }
      }
    };

    // if `getAccount` in opts returns wallet address, it returns wallet,
    // and if not or function is not defined, it will return `NO_ACCOUNT`.
    this.api.asset.getAccount = callOrReject(this.opts.getAccount, 'NO_ACCOUNT');
    this.api.asset.getPublicKey = callOrReject(this.opts.getPublicKey, 'NO_ACCOUNT');
    this.api.asset.send = this.opts.send;
    this.api.message.signMessage = this.opts.signMessage;
    this.api.message.signMessageHash = this.opts.signMessageHash;
    this.api.smartContract.invoke = this.opts.invoke;
    this.api.smartContract.invokeRead = this.opts.invokeRead;
    this.api.smartContract.deploy = this.opts.deploy;
  }
}