import fs from "fs";
import { Contract, defaultProvider, ec, json, stark, constants, Provider } from "starknet";
console.log("Reading OZ Account Contract...");
const compiledOZAccount = json.parse(fs.readFileSync("./artifacts/Account.json").toString("ascii"));

let testnetURL = "https://alpha4.starknet.io";
let mainnetURL = " https://alpha-mainnet.starknet.io";

let baseUrl = mainnetURL;

const provider = new Provider({
  sequencer: {
    baseUrl: `${baseUrl}`,
    chainId: constants.StarknetChainId.MAINNET,
    feederGatewayUrl: `${baseUrl}/feeder_gateway`,
    gatewayUrl: `${baseUrl}/gateway`,
  },
});

async function main() {
  // Generate public and private key pair.
  const privateKey = stark.randomAddress();

  // const starkKeyPair = ec.genKeyPair(); // check if this is safe
  // console.log(starkKeyPair);

  const starkKeyPair = ec.getKeyPair(privateKey);
  const starkKeyPub = ec.getStarkKey(starkKeyPair);

  // Deploy the Account contract and wait for it to be verified on StarkNet.
  console.log("Deployment Tx - Account Contract to StarkNet...");
  const accountResponse = await provider.deployContract({
    contract: compiledOZAccount,
    constructorCalldata: [starkKeyPub],
    addressSalt: starkKeyPub,
  });
  // Wait for the deployment transaction to be accepted on StarkNet
  console.log(
    "Waiting for Tx " + accountResponse.transaction_hash + " to be Accepted on Starknet - OZ Account Deployment...",
  );
  await provider.waitForTransaction(accountResponse.transaction_hash);
  console.log("✨ Account Deployed at " + accountResponse.contract_address + " !!");
  //Ready to be used !!!
  console.log(`PRIVATE_KEY=${privateKey}`);
  console.log(`PUBLIC_KEY=${starkKeyPub}`);
  console.log(`ACCOUNT_ADDRESS=${accountResponse.contract_address}`);
  const accountContract = new Contract(compiledOZAccount.abi, accountResponse.contract_address);
}

main();
