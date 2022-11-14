import { StarkNetWallet } from "../src/StarkNetWallet";
import { getProvider } from "../src/ProviderConfig";

async function main() {
  let provider = getProvider();
  let newMnemonic = StarkNetWallet.generateSeed();
  console.log(`A new unused seed ${newMnemonic}`);
  await StarkNetWallet.deployNewAccount(newMnemonic, provider);
}

main();
