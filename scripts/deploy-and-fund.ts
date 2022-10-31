import { StarkNetWallet } from "../src/StarkNetWallet";
import { FeederProvider } from "../src/ProviderConfig";
import { utils } from "ethers";

function getProvider() {
  return new FeederProvider("http://127.0.0.1:5050");
}

async function main() {
  let accountBalance = await StarkNetWallet.getBalance(StarkNetWallet.getAccount().address);
  console.log("Funder Balance", utils.formatEther(accountBalance));

  let newAccount = await StarkNetWallet.deployNewAccount();

  let starknetWallet = new StarkNetWallet();

  console.log("Funding");

  let amount = utils.parseEther("1");
  await starknetWallet.transfer(newAccount.address, amount);

  let newAccountBalance = await StarkNetWallet.getBalance(newAccount.address);
  console.log("New Balance", utils.formatEther(newAccountBalance));
}

main();
