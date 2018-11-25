
import {WalletSubProvider, WalletSubProviderOptions} from "../../providers/subproviders";
import { OntLedger } from "./ont-ledger";
import {Signature} from "ontology-dapi";


export interface LedgerSubProviderOptions extends WalletSubProviderOptions {
  accountIndex?: number | (() => Promise<number>);
  neoCompatible?: boolean | (() => Promise<boolean>);
}


export class LedgerSubProvider extends WalletSubProvider {
  opts: LedgerSubProviderOptions;

  constructor (opts?: LedgerSubProviderOptions) {
    super();
    this.opts = (opts) ? opts : {};

    this.api.asset.getAccount = this.opts.getAccount || (async (): Promise<string> => {
      const ledger = await OntLedger.init();
      const accountIndex = await this.accountIndex();
      const neoCompatible = await this.neoCompatible();

      const address = await ledger.getAddress(accountIndex, neoCompatible);
      await ledger.close();
      return address;
    });

    this.api.asset.getPublicKey = this.opts.getPublicKey || (async (): Promise<string> => {
      const ledger = await OntLedger.init();
      const accountIndex = await this.accountIndex();
      const neoCompatible = await this.neoCompatible();

      const publicKey = await ledger.getPublicKey(accountIndex, neoCompatible);
      await ledger.close();
      return publicKey.serializeHex();
    });

    this.api.message.signMessage = this.opts.signMessage || (async ({ message }: { message: string }): Promise<Signature> => {
      const ledger = await OntLedger.init();
      const accountIndex = await this.accountIndex();
      const neoCompatible = await this.neoCompatible();

      const publicKey = await ledger.getPublicKey(accountIndex, neoCompatible);
      const sig = await ledger.getSignature(message, accountIndex, neoCompatible);

      return <Signature>{
        publicKey: publicKey.serializeHex(),
        data: sig
      };
    });
  }

  async accountIndex(): Promise<number> {
    // if no account index, use default 0.
    if (!this.opts.accountIndex) {
      return 0;
    }

    if (typeof this.opts.accountIndex === 'number') {
      return Promise.resolve(this.opts.accountIndex);
    } else {
      return await this.opts.accountIndex();
    }
  }

  async neoCompatible(): Promise<boolean> {
    // if not defined, return default false.
    if (!this.opts.neoCompatible) {
      return false;
    }

    if (typeof this.opts.neoCompatible === 'boolean') {
      return Promise.resolve(this.opts.neoCompatible);
    } else {
      return await this.opts.neoCompatible();
    }
  }
}