import { RpcProvider, ProviderInterface, SequencerProvider } from "starknet";

export function getProvider(nodeUrl: string): ProviderInterface {
  const provider = new RpcProvider({
    nodeUrl,
  });
  // const provider = new SequencerProvider({
  //   baseUrl: nodeUrl,
  // });
  return provider;
}
