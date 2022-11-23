import { StarkNetWallet } from "../src/StarkNetWallet";
import { getProvider } from "../src/ProviderConfig";
import { utils } from "ethers";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const MNEMONIC = process.env.MNEMONIC || "";
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;

async function main() {
  let provider = getProvider();

  // let funderWallet = new StarkNetWallet(PRIVATE_KEY, provider, ACCOUNT_ADDRESS);
  let funderWallet = StarkNetWallet.fromMnemonic(MNEMONIC, 0, provider);

  let funderBalance = await funderWallet.getBalance();
  console.log("Funder Balance", utils.formatEther(funderBalance));

  let classHash = "0x2479d87ac7436daf0db999c09631ea2bacc19c10c5d669dd8bb593bdd006f70";
  await funderWallet.declareNewContract("./artifacts/simple.json", classHash);

  await funderWallet.deployNewContract(classHash, []);
}

main();
