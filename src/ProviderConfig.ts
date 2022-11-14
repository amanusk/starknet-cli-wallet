import { SequencerProvider, ProviderInterface } from "starknet";

const NETWORK = process.env.NETWORK || "";
const RPC_URL = process.env.RPC_URL || "";

export type NetworkName = "goerli-alpha" | "mainnet-alpha";

function getNetworkConfig(): NetworkName {
  if (NETWORK == "mainnet" || NETWORK == "mainnet-alpha") {
    return "mainnet-alpha";
  } else {
    return "goerli-alpha";
  }
}

export function getProvider(): ProviderInterface {
  let baseUrl = "http://localhost:5050";
  if (NETWORK == "devnet") {
    if (RPC_URL != "") {
      baseUrl = RPC_URL;
    }
    console.log(`Using DEVNET with URL ${baseUrl}`);
    return new SequencerProvider({
      baseUrl: `${baseUrl}`,
    });
  }
  let network = getNetworkConfig();
  return new SequencerProvider({ network: network });
}
