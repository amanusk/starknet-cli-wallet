import { StarkNetWallet } from "../src/StarkNetWallet";
import { FeederProvider } from "../src/ProviderConfig";
import { utils } from "ethers";

function getProvider() {
  return new FeederProvider("http://127.0.0.1:5050");
}

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;

async function main() {
  let provider = getProvider();

  let starknetWallet = new StarkNetWallet(PRIVATE_KEY, provider, ACCOUNT_ADDRESS);

  let funderBalance = await starknetWallet.getBalance();
  console.log("Funder Balance", utils.formatEther(funderBalance));

  let newAccount = await StarkNetWallet.deployNewAccount(provider);
  console.log("Funding");

  let amount = utils.parseEther("1");
  await starknetWallet.transfer(newAccount.address, amount);

  let newAccountBalance = await StarkNetWallet.getBalance(newAccount.address, provider);
  console.log("New Balance", utils.formatEther(newAccountBalance));
}

main();
