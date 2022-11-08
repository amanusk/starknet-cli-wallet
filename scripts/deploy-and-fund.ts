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
  await StarkNetWallet.deployNewAccount(newMnemonic, provider);
  console.log("Funding");

  let newWallet = StarkNetWallet.fromMnemonic(newMnemonic, 0, provider);

  let amount = utils.parseEther("1");
  await funderWallet.transfer(futureAddress, amount);

  let newAccountBalance = await newWallet.getBalance();
  console.log("New Balance", utils.formatEther(newAccountBalance));

  await newWallet.transfer(funderWallet.getAddress(), amount.div(2));

  funderBalance = await funderWallet.getBalance();
  console.log("Funder Balance", utils.formatEther(funderBalance));

  newAccountBalance = await newWallet.getBalance();
  console.log("New Account Balance", utils.formatEther(newAccountBalance));
}

main();
