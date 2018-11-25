import {
  AssetApi,
  IdentityApi,
  MessageApi,
  NetworkApi,
  ProviderApi,
  SmartContractApi
} from "ontology-dapi";
import {OntologyProviderEngine} from "./provider-engine";

export interface OntologyProviderPayload {
  component: string,
  method: string,
  args: any;
}

export interface OntologyProviderAPI {
  asset?: AssetApi;
  identity?: IdentityApi;
  message?: MessageApi;
  network?: NetworkApi;
  provider?: ProviderApi;
  smartContract?: SmartContractApi;
  [apiName: string]: any;
}

export class OntologyProvider {
  engine: OntologyProviderEngine;
  api: OntologyProviderAPI;

  constructor() {
    this.api = {
      asset: <AssetApi>{},
      identity: <IdentityApi>{},
      message: <MessageApi>{},
      network: <NetworkApi>{},
      provider: <ProviderApi>{},
      smartContract: <SmartContractApi>{}
    };
  }

  // noinspection JSMethodCanBeStatic
  /**
   * Handles a request. If this provider can handle, finish the request by calling `end`. Or if this provider cannot,
   * take it over to the next provider by calling `next` function.
   *
   * @param payload request type and arguments.
   * @param next function for taking over the request to the next provider.
   * @param end function for finishing the request.
   */
  public async handleRequest(
    payload: OntologyProviderPayload,
    next: () => Promise<any>,
    end: (err: any, args: any) => Promise<any>
  ) {
    if (!this.api[payload.component] || !this.api[payload.component][payload.method]) {
      // if current provider does not support the request, take it over to the next provider.
      return await next();
    } else {
      // if current provider supports the request, finish the request.
      const result = await this.api[payload.component][payload.method](payload.args);
      return await end(null, this.afterCall(result));
    }
  }

  // noinspection JSMethodCanBeStatic
  /**
   * Manufactures the result data after api function called.
   * @param data data from API
   */
  public async afterCall(data: any) {
    return data;
  }
}