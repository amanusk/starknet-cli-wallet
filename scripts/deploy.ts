import { StarkNetWallet } from "../src/StarkNetWallet";

async function main() {
  await StarkNetWallet.deployNewAccount();
}

main();
