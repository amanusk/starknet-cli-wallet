import { ensureEnvVar } from "./util";
import { program } from "commander";
import { utils } from "ethers";
import { getProvider } from "./ProviderConfig";

import { StarkNetWallet } from "./StarkNetWallet";

import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const MNEMONIC = process.env.MNEMONIC || "";
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;

function getWalletFromConfig(): StarkNetWallet {
  let provider = getProvider();
  if (PRIVATE_KEY != "") {
    return new StarkNetWallet(PRIVATE_KEY, provider, ACCOUNT_ADDRESS);
  } else if (MNEMONIC != "") {
    return StarkNetWallet.fromMnemonic(MNEMONIC, 0, provider, ACCOUNT_ADDRESS);
  } else {
    let mnemonic = StarkNetWallet.generateSeed();
    return StarkNetWallet.fromMnemonic(mnemonic, 0, provider);
  }
}

program.command("balance [address] [token_address]").action(async (address: string, tokenAddress: string, options) => {
  let provider = getProvider();
  if (address == undefined) {
    let wallet = getWalletFromConfig();
    let balanceBigNumber = await wallet.getBalance(tokenAddress);
    console.log(`Address ${wallet.getAddress()}`);
    console.log(`Balance ${utils.formatEther(balanceBigNumber)}`);
  } else {
    let balanceBigNumber = await StarkNetWallet.getBalance(address, provider, tokenAddress);
    console.log(`Address ${address}`);
    console.log(`Balance ${utils.formatEther(balanceBigNumber)}`);
  }
});

program
  .command("transfer <recipientAddress> <amount>")
  .option("-t --token <tokenAddress>")
  .option("-d --decimals <decimals>")
  .action(async (recipientAddress: string, amount: string, options) => {
    if (recipientAddress == null) {
      console.warn("Must specify a destination address to trasnfer to");
    }

    let decimals = 18;
    if (options.decimals == null) {
      decimals = options.decimals;
    }

    let tokenAddress = options.tokenAddress;
    if (tokenAddress == null) {
      tokenAddress = ensureEnvVar("TOKEN_ADDRESS");
    }
    let wallet = getWalletFromConfig();
    await wallet.transfer(recipientAddress, utils.parseUnits(amount, decimals));
  });

program.command("declare <filename> <classHash>").action(async (filename: string, classHash: string, options) => {
  let wallet = getWalletFromConfig();
  await wallet.declareNewContract(filename, classHash);
});

program
  .command("deploy <classHash> [constructorArgs...]")
  .action(async (classHash: string, constructorArgs: string[], options) => {
    let wallet = getWalletFromConfig();
    await wallet.deployNewContract(classHash, constructorArgs);
  });

program
  .command("invoke <contractAddress>  <selector> [calldata...]")
  .action(async (contractAddress: string, selector: string, calldata: string[], options) => {
    let wallet = getWalletFromConfig();
    await wallet.invoke(contractAddress, selector, calldata);
  });

program
  .command("call <contractAddress>  <selector> [calldata...]")
  .action(async (contractAddress: string, selector: string, calldata: string[], options) => {
    let wallet = getWalletFromConfig();
    await wallet.call(contractAddress, selector, calldata);
  });

program.command("generate_seed").action(async options => {
  StarkNetWallet.generateSeed();
});

program.command("generate_pk").action(async options => {
  StarkNetWallet.generatePk();
});

program.command("address").action(async options => {
  let wallet = getWalletFromConfig();
  console.log(`Account address: ${wallet.getAddress()}`);
});

program.parse(process.argv);
