import { Provider, constants } from "starknet";

export type NetworkPreset = "goerli-alpha" | "mainnet-alpha";

export class RPCProvider extends Provider {
  constructor(baseUrl: string) {
    super({ rpc: { nodeUrl: baseUrl } });
  }
}

export class FeederProvider extends Provider {
  constructor(baseUrl: string, chainId: constants.StarknetChainId = constants.StarknetChainId.TESTNET, uuid?: string) {
    super({
      sequencer: {
        baseUrl: `${baseUrl}`,
        chainId: chainId, // same for devnet
        feederGatewayUrl: `${baseUrl}/feeder_gateway`,
        gatewayUrl: `${baseUrl}/gateway`,
        // TODO: Update to latest version with uuid
        // headers: {
        //   Authorization: `Basic ${Buffer.from(uuid + ":").toString("base64")}`,
        // },
      },
    });
  }
}

export class StarkNetProvider extends Provider {
  constructor(network: NetworkPreset) {
    super({ sequencer: { network: network } });
  }
}
