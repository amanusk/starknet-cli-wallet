import { ensureEnvVar } from "./util";
import { program } from "commander";
import { getProvider } from "./ProviderConfig";
import { ethers } from "ethers";

import { StarkNetWallet } from "./StarkNetWallet";
export const DEFAULT_TOKEN_ADDRESS = "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
export const DEFAULT_STRK_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const MNEMONIC = process.env.MNEMONIC || "";
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;

// sepolia  by default
const STARKNET_RPC_URL = process.env.STARKNET_RPC_URL || "https://starknet-sepolia.public.blastapi.io/rpc/v0_6";

// Default class hash
const ACCOUNT_CLASS_HASH =
  process.env.ACCOUNT_CLASS_HASH || "0x000903752516de5c04fe91600ca6891e325278b2dfc54880ae11a809abb364844";

function getWalletFromConfig(txVersion = 2): StarkNetWallet {
  let accountAddress = ACCOUNT_ADDRESS;
  console.log("Account Class Hash", ACCOUNT_CLASS_HASH);
  if (ACCOUNT_ADDRESS == undefined) {
    if (PRIVATE_KEY != "") {
      accountAddress = StarkNetWallet.computeAddressFromPk(PRIVATE_KEY, ACCOUNT_CLASS_HASH);
    }
    if (MNEMONIC != "") {
      accountAddress = StarkNetWallet.computeAddressFromMnemonic(MNEMONIC, ACCOUNT_CLASS_HASH);
    }
  }
  console.log("Account Address: ", accountAddress);
  let provider = getProvider(STARKNET_RPC_URL);
  if (PRIVATE_KEY != "") {
    return new StarkNetWallet(PRIVATE_KEY, provider, accountAddress, ACCOUNT_CLASS_HASH, txVersion);
  } else if (MNEMONIC != "") {
    return StarkNetWallet.fromMnemonic(MNEMONIC, 0, provider, accountAddress, ACCOUNT_CLASS_HASH, txVersion);
  } else {
    let mnemonic = StarkNetWallet.generateSeed();
    return StarkNetWallet.fromMnemonic(mnemonic, 0, provider);
  }
}

program
  .command("balance [address] [token_address]")
  .option("-t --token <token>")
  .action(async (address: string, tokenAddress: string, options) => {
    let provider = getProvider(STARKNET_RPC_URL);
    let res = provider.getInvokeEstimateFee;
    if (address == undefined) {
      let wallet = getWalletFromConfig();
      address = wallet.getAddress();
    }
    if (options.token == undefined) {
      let balanceEth = await StarkNetWallet.getBalance(address, provider, DEFAULT_TOKEN_ADDRESS);
      let balanceStrk = await StarkNetWallet.getBalance(address, provider, DEFAULT_STRK_ADDRESS);
      console.log(`Address ${address}`);
      console.log(`Eth Balance ${ethers.formatEther(balanceEth.toString())}`);
      console.log(`Strk Balance ${ethers.formatEther(balanceStrk.toString())}`);
    } else {
      let balanceEth = await StarkNetWallet.getBalance(address, provider, options.token);
      console.log(`Address ${address}`);
      console.log(`Token ${options.token}`);
      console.log(`Balance ${ethers.formatEther(balanceEth.toString())}`);
    }
  });

program
  .command("transfer <recipientAddress> <amount>")
  .option("-t --token <token>")
  .option("-d --decimals <decimals>")
  .option("-v3 --v3")
  .action(async (recipientAddress: string, amount: string, options) => {
    if (recipientAddress == null) {
      console.warn("Must specify a destination address to trasnfer to");
    }

    let decimals = 18;
    if (options.decimals == null) {
      decimals = options.decimals;
    }
    let tokenAddress = options.token;
    if (tokenAddress == null) {
      tokenAddress = ensureEnvVar("TOKEN_ADDRESS");
    }
    if (options.v3) {
      let wallet = getWalletFromConfig(3);
      console.log(`Transfering ${amount} tokens ${tokenAddress} to ${recipientAddress}`);
      await wallet.transfer(recipientAddress, ethers.parseUnits(amount, decimals), tokenAddress);
    } else {
      let wallet = getWalletFromConfig(2);
      console.log(`Transfering ${amount} tokens ${tokenAddress} to ${recipientAddress}`);
      await wallet.transfer(recipientAddress, ethers.parseUnits(amount, decimals), tokenAddress);
    }
  });

program
  .command("declare <filename> [casm_filename]")
  .option("-ch --class_hash <classHash>")
  .option("-cch --compiled_class_hash <compiledClassHash>")
  .action(async (filename: string, casm_filename: string, options) => {
    let wallet = getWalletFromConfig();
    await wallet.declareNewContract(filename, options.classHash, casm_filename, options.compiledClassHash);
  });

program
  .command("deploy <classHash> <salt> [constructorArgs...]")
  .option("-u --unique")
  .action(async (classHash: string, salt: string, constructorArgs: string[], options) => {
    let wallet = getWalletFromConfig();
    await wallet.deploy(classHash, salt, options.unique, constructorArgs);
  });

program.command("deploy_account").action(async (classHash: string, constructorArgs: string[], options) => {
  let wallet = getWalletFromConfig();
  await wallet.deployAccount(ACCOUNT_CLASS_HASH);
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

program.command("get_keys").action(async options => {
  let wallet = getWalletFromConfig();
  console.log(`Account address: ${wallet.getAddress()}`);
  console.log(`Account PrivateKey: ${wallet.getPrivateKey()}`);
  console.log(`Account PublicKey: ${await wallet.getPublicKey()}`);
});

program.parse(process.argv);
