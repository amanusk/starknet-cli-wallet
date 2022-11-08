import { StarkNetWallet } from "../src/StarkNetWallet";
import { FeederProvider } from "../src/ProviderConfig";

function getProvider() {
  return new FeederProvider("http://127.0.0.1:5050");
}

async function main() {
  let provider = getProvider();
  let newMnemonic = StarkNetWallet.generateSeed();
  console.log(`A new unused seed ${newMnemonic}`);
  await StarkNetWallet.deployNewAccount(newMnemonic, provider);
}

main();
