import { StarkNetWallet } from "../src/StarkNetWallet";
import { getProvider } from "../src/ProviderConfig";

import * as dotenv from "dotenv";
dotenv.config();
let MNEMONIC = process.env.MNEMONIC || "";

// NOTICE: THIS WILL NOT WORK ONCE DEPLOY IS TURNED OFF
async function main() {
  let provider = getProvider();
  if (MNEMONIC == "") {
    MNEMONIC = StarkNetWallet.generateSeed();
    console.log(`A new unused seed ${MNEMONIC}`);
  }

  await StarkNetWallet.deployNewAccount(MNEMONIC, provider);
}

main();
