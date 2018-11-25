import {OntologyProvider, OntologyProviderPayload} from "./provider";
import { Provider } from 'ontology-dapi';

export interface OntologyProviderOptions {
  providerInfo: Provider;
}

export class OntologyProviderEngine {
  protected _working: boolean;
  protected _providers: any[] = [];

  constructor(public opts?: OntologyProviderOptions) {
  }

  /**
   * Adds a provider in the engine. When getting a request, added providers will work, finish the request or take it
   * over the next provider.
   * @param provider provider to add.
   */
  public addProvider(provider: OntologyProvider) {
    this._providers.push(provider);
    provider.engine = this;
  }

  /**
   * Starts the provider engine. For response, it must be called before request.
   */
  public start() {
    this._working = true;
  }

  /**
   * Stops the provider engine.
   */
  public stop() {
    this._working = false;
  }

  /**
   * Sends a method and parameters to providers.
   *
   * @param method function name.
   * @param args function arguments.
   */
  public async sendAsync(method: string, args?: any): Promise<any> {
    if (!this._working) {
      return Promise.reject('Provider engine didn\'t start or was stopped');
    }

    // method name is like `{component}.{method}`
    // Parse the method and argument and build payload.
    const [ _component, _method, ...surplus ] = method.split('.');

    if (surplus.length > 0) {
      throw new Error('unsupported dapi method');
    }

    let currentProviderIndex = -1;

    // provider will get this payload
    const payload: OntologyProviderPayload = {
      component: _component,
      method: _method,
      args
    };

    // When `end` is called, it will finish the request.
    // If error occurs, call end with _err parameter, nor with null.
    const end = async (_err: any, _result?: any) => {
      if (_err) return Promise.reject(_err);
      else return Promise.resolve(_result);
    };

    // When `next` is called, it will take over the request to the next provider.
    const next = async () => {
      ++currentProviderIndex;

      if (this._providers.length <= currentProviderIndex) {
        return await end(new Error(`Requested method ${method} is not handled by any providers.`));
      }

      try {
        return await this._providers[currentProviderIndex].handleRequest(payload, next, end);
      } catch (e) {
        // When exception occurs, end the request with error.
        return await end(e);
      }
    };

    // if the request method is `provider.getProvider()` and the provider has the information,
    // response and don't take it over to the sub-providers.
    if (_component === 'provider' && _method === 'getProvider' && this.opts.providerInfo) {
      return await end(null, this.opts.providerInfo);
    }

    // take over the request to the sub-providers.
    return await next();
  }
}