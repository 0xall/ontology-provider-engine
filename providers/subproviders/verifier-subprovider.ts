
import { OntologyProvider } from '../provider';
import { Signature } from 'ontology-dapi';
import { Crypto, utils } from 'ontology-ts-sdk';


export interface VerifierSubProviderOptions {
  verifyMessage?: ({ message, signature }: { message: string, signature: Signature }) => Promise<boolean>;
  verifyMessageHash?: ({ messageHash, signature }: { messageHash: string, signature: Signature }) => Promise<boolean>;
}


export class VerifierSubProvider extends OntologyProvider {
  opts: VerifierSubProviderOptions;

  constructor(opts?: VerifierSubProviderOptions) {
    super();

    this.opts = (opts) ? opts : {};

    this.api.message.verifyMessage = this.opts.verifyMessage || (async (
      { message, signature }: { message: string, signature: Signature }
      ): Promise<boolean> => {
      const messageHex = utils.str2hexstr(message);

      const sig = Crypto.Signature.deserializeHex(signature.data);
      const publicKey = Crypto.PublicKey.deserializeHex(new utils.StringReader(signature.publicKey));

      return publicKey.verify(messageHex, sig);
    });

    this.api.message.verifyMessageHash = this.opts.verifyMessageHash || (async (
      { messageHash, signature }: { messageHash: string, signature: Signature }
    ) => {
      // if message hash is not hex encoded, throw error
      if (!messageHash.match(/^[A-Fa-f0-9]+$/g)) {
        throw new Error('MALFORMED_MESSAGE');
      }

      const sig = Crypto.Signature.deserializeHex(signature.data);
      const publicKey = Crypto.PublicKey.deserializeHex(new utils.StringReader(signature.publicKey));

      return publicKey.verify(messageHash, sig);
    });
  }
}