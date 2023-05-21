// Example of a script which:
// Computes the future address of an account
// Transfers some funds into the account
// Deploys the account at the new address with the DEPLOY_ACCOUNT tx

import { StarkNetWallet } from "../src/StarkNetWallet";
import { getProvider } from "../src/ProviderConfig";
import { ethers } from "ethers";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const MNEMONIC = process.env.MNEMONIC || "";
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;

async function main() {
  let provider = getProvider();

  // if (MNEMONIC == "") {
  //   console.log("You must provide MNEMONIC");
  //   process.exit();
  // }

  let funderWallet = new StarkNetWallet(PRIVATE_KEY, provider, ACCOUNT_ADDRESS);
  // let funderWallet = StarkNetWallet.fromMnemonic(MNEMONIC, 0, provider);

  let funderBalance = await funderWallet.getBalance();
  // console.log("Funder Balance", utils.formatEther(funderBalance));
  console.log("Funder Balance", funderBalance);

  let newMnemonic = StarkNetWallet.generateSeed();
  let futureAddress = StarkNetWallet.computeAddressFromMnemonic(newMnemonic);
  console.log(`Future Address ${futureAddress}`);

  let amount = ethers.parseEther("0.005").toBigInt();
  console.log("Transfering amount", amount);
  await funderWallet.transfer(futureAddress, amount);

  let newAccountBalance = await StarkNetWallet.getBalance(futureAddress, provider);
  console.log("Funded Balance", newAccountBalance);

  await StarkNetWallet.deployPrefundedAccount(futureAddress, newMnemonic, provider);

  newAccountBalance = await StarkNetWallet.getBalance(futureAddress, provider);
  console.log("Funded Balance After Deploy", newAccountBalance);
}

main();
