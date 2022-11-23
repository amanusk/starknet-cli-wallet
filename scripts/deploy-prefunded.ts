import { StarkNetWallet } from "../src/StarkNetWallet";
import { getProvider } from "../src/ProviderConfig";
import { utils } from "ethers";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const MNEMONIC = process.env.MNEMONIC || "";
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;

async function main() {
  let provider = getProvider();

  if (MNEMONIC == "") {
    console.log("You must provide MNEMONIC");
    process.exit();
  }

  // let funderWallet = new StarkNetWallet(PRIVATE_KEY, provider, ACCOUNT_ADDRESS);
  let funderWallet = StarkNetWallet.fromMnemonic(MNEMONIC, 0, provider);

  let funderBalance = await funderWallet.getBalance();
  console.log("Funder Balance", utils.formatEther(funderBalance));

  let newMnemonic = StarkNetWallet.generateSeed();
  let futureAddress = StarkNetWallet.computeAddressFromMnemonic(newMnemonic);
  console.log(`Future Address ${futureAddress}`);

  let amount = utils.parseEther("0.005");
  await funderWallet.transfer(futureAddress, amount);

  let newAccountBalance = await StarkNetWallet.getBalance(futureAddress, provider);
  console.log("Funded Balance", utils.formatEther(newAccountBalance));

  await StarkNetWallet.deployPrefundedAccount(futureAddress, newMnemonic, provider);

  newAccountBalance = await StarkNetWallet.getBalance(futureAddress, provider);
  console.log("Funded Balance After Deploy", utils.formatEther(newAccountBalance));
}

main();
