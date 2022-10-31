import { Provider, constants } from "starknet";

let baseUrl = "http://127.0.0.1:5050/rpc";

const provider = new Provider({
  // sequencer: {
  //   baseUrl: `${baseUrl}`,
  //   chainId: constants.StarknetChainId.TESTNET,
  //   feederGatewayUrl: `${baseUrl}/feeder_gateway`,
  //   gatewayUrl: `${baseUrl}/gateway`,
  // },
  rpc: { nodeUrl: `${baseUrl}` },
});

async function main() {
  let block = await provider.getBlock(0);
  console.log(block);
}

main();
