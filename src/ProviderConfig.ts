import { RpcProvider, ProviderInterface } from "starknet";

export function getProvider(nodeUrl: string): ProviderInterface {
  const provider = new RpcProvider({
    nodeUrl,
  });
  return provider;
}
