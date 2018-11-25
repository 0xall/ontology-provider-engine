
import LedgerNode from '@ledgerhq/hw-transport-node-hid';
import * as elliptic from "elliptic";
import { Crypto } from 'ontology-ts-sdk';
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import {StringReader} from "ontology-ts-sdk/lib/types/utils";
import StringStream from "./string-reader";

const VALID_STATUS = 0x9000;
const MSG_TOO_BIG = 0x6d08;
const APP_CLOSED = 0x6e00;
const TX_DENIED = 0x6985;
const TX_PARSE_ERR = 0x6d07;

export const ONT_LEDGER_ERROR = {
  NOT_SUPPORT: 'NOT_SUPPORT',
  NOT_FOUND: 'NOT_FOUND',

};

export const ONT_LEDGER_ERROR_CODE: any = {
  0x9000: 'VALID_STATUS',
  0x6d08: 'MSG_TOO_BIG',
  0x6e00: 'APP_CLOSED',
  0x6985: 'TX_DENIED',
  0x6d07: 'TX_PARSE_ERR'
};

const BIP44 = (acct = 0, neo = false) => {
  const acctNumber = acct.toString(16);
  const coinType = neo ? '80000378' : '80000400';

  return (
    '8000002C' +
    coinType +
    '80000000' +
    '00000000' +
    '0'.repeat(8 - acctNumber.length) +
    acctNumber
  )
};

export class OntLedger {
  path: string;
  device: TransportNodeHid;

  constructor(path: string) {
    this.path = path;
  }

  static async init() {
    if (!(await LedgerNode.isSupported())) {
      throw 'NOT_SUPPORT';
    }

    // get ledger list connected with the computers
    const paths = await LedgerNode.list();

    if (paths.length == 0) {
      throw 'NOT_FOUND';
    }

    const ledger = new OntLedger(paths[0]);
    return ledger.open();
  }

  async open(): Promise<OntLedger> {
    try {
      this.device = await LedgerNode.open(this.path);
      return this;
    } catch (e) {
      throw ONT_LEDGER_ERROR_CODE[e.statusCode];
    }
  }

  async close(): Promise<void> {
    if (this.device) return this.device.close();
    return Promise.resolve();
  }

  /**
   * Returns the public key of an address.
   *
   * @param accountIndex account index.
   * @param neoCompatible whether compatible with neo.
   */
  async getPublicKey(accountIndex: number, neoCompatible: boolean): Promise<Crypto.PublicKey> {
    const res = await this.send('80040000', BIP44(accountIndex, neoCompatible), [VALID_STATUS]);
    const publicKey = res.toString('hex').substring(0, 130);
    console.log(publicKey);
    const ecc = new elliptic.ec(Crypto.CurveLabel.SECP256R1.preset);
    const keyPair = ecc.keyFromPublic(Buffer.from(publicKey, 'hex'), 'hex');
    const compressed = keyPair.getPublic(true, 'hex');

    return new Crypto.PublicKey(compressed);
  }

  /**
   * Returns the base58 address from ledger.
   *
   * @param accountIndex account index.
   * @param neoCompatible whether compatible with neo.
   */
  async getAddress(accountIndex: number, neoCompatible: boolean): Promise<string> {
    const publicKey = await this.getPublicKey(accountIndex, neoCompatible);
    return Crypto.Address.fromPubKey(publicKey).toBase58();
  }

  async send(params: string, msg: string, statusList: number[]): Promise<Buffer> {
    // parameter should be 4 bytes.
    if (!params.match(/^[a-fA-F0-9]{8}$/g)) throw new Error(`params requires 4 bytes`);

    // divide 4 bytes
    const [cla, ins, p1, p2] = params.match(/.{2}/g).map(i => parseInt(i, 16));
    try {
      return await this.device.send(cla, ins, p1, p2, Buffer.from(msg, 'hex'), statusList)
    } catch (e) {
      throw ONT_LEDGER_ERROR_CODE[e.statusCode];
    }
  }

  async getSignature(data: string, accountIndex: number, neoCompatible: boolean): Promise<string> {
    data += BIP44(accountIndex, neoCompatible);
    const chunks = data.match(/.{1,510}/g) || [];
    if (!chunks.length) throw new Error(`Invalid data provided: ${data}`);

    let response: Buffer | number;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const params = `8002${(i === chunks.length - 1) ? '80' : '00'}00`;

      try {
        response = await this.send(params, chunk, [VALID_STATUS]);
        console.log(response);
      } catch (e) {
        return ONT_LEDGER_ERROR_CODE[e.statusCode];
      }
    }

    if (response == 0x9000) {
      throw new Error(`No more data but Ledger did not return signature!`);
    }

    return OntLedger.assembleSignature((<any>response).toString('hex'));
  }

  static assembleSignature(response: string): string {
    let ss = new StringStream(response);
    // The first byte is format. It is usually 0x30 (SEQ) or 0x31 (SET)
    // The second byte represents the total length of the DER module.
    ss.read(2);
    // Now we read each field off
    // Each field is encoded with a type byte, length byte followed by the data itself
    ss.read(1); // Read and drop the type
    const r = ss.readVarBytes();
    ss.read(1);
    const s = ss.readVarBytes();

    console.log(r, s);

    // We will need to ensure both integers are 32 bytes long
    const integers = [r, s].map(i => {
      if (i.length < 64) {
        i = i.padStart(64, '0')
      }
      if (i.length > 64) {
        i = i.substr(-64)
      }
      return i
    });

    return integers.join('')
  }
}
