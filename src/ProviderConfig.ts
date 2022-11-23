import { SequencerProvider, ProviderInterface } from "starknet";

export type NetworkName = "goerli-alpha" | "mainnet-alpha";

function getNetworkConfig(): NetworkName {
  if (process.env.NETWORK == "mainnet" || process.env.NETWORK == "mainnet-alpha") {
    return "mainnet-alpha";
  } else {
    return "goerli-alpha";
  }
}

export function getProvider(): ProviderInterface {
  if (process.env.RPC_URL != undefined) {
    console.log(`Using RPC with URL ${process.env.RPC_URL}`);
    return new SequencerProvider({
      baseUrl: `${process.env.RPC_URL}`,
    });
  }
  if (process.env.NETWORK == "devnet") {
    let baseUrl = "http://localhost:5050";
    console.log(`Using DEVNET with URL ${baseUrl}`);
    return new SequencerProvider({
      baseUrl: `${baseUrl}`,
    });
  }
  let network = getNetworkConfig();
  return new SequencerProvider({ network: network });
}
