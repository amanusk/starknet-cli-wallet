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

  let funderWallet = new StarkNetWallet(PRIVATE_KEY, provider, ACCOUNT_ADDRESS);

  let funderBalance = await funderWallet.getBalance();
  console.log("Funder Balance", utils.formatEther(funderBalance));

  let newMnemonic = StarkNetWallet.generateSeed();
  let futureAddress = StarkNetWallet.computeAddressFromMnemonic(newMnemonic);
  console.log(`Future Address ${futureAddress}`);

  let amount = utils.parseEther("1");
  await funderWallet.transfer(futureAddress, amount);

  let newAccountBalance = await StarkNetWallet.getBalance(futureAddress, provider);
  console.log("Funded Balance", utils.formatEther(newAccountBalance));

  await StarkNetWallet.deployPrefundedAccount(futureAddress, newMnemonic, provider);

  newAccountBalance = await StarkNetWallet.getBalance(futureAddress, provider);
  console.log("Funded Balance After Deploy", utils.formatEther(newAccountBalance));
}

main();
