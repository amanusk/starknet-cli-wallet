import { ensureEnvVar } from "./util";
import { program } from "commander";
import { getProvider } from "./ProviderConfig";
import { ethers } from "ethers";

import { StarkNetWallet } from "./StarkNetWallet";

import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const MNEMONIC = process.env.MNEMONIC || "";
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;

// sepolia  by default
const STARKNET_RPC_URL = process.env.STARKNET_RPC_URL || "https://starknet-sepolia.public.blastapi.io/rpc/v0_6";

function getWalletFromConfig(txVersion = 2): StarkNetWallet {
  let accountAddress = ACCOUNT_ADDRESS;
  if (ACCOUNT_ADDRESS == undefined) {
    if (PRIVATE_KEY != "") {
      accountAddress = StarkNetWallet.computeAddressFromPk(PRIVATE_KEY);
    }
    if (MNEMONIC != "") {
      accountAddress = StarkNetWallet.computeAddressFromMnemonic(MNEMONIC);
    }
  }
  console.log("Account Address: ", accountAddress);
  let provider = getProvider(STARKNET_RPC_URL);
  if (PRIVATE_KEY != "") {
    return new StarkNetWallet(PRIVATE_KEY, provider, accountAddress, txVersion);
  } else if (MNEMONIC != "") {
    return StarkNetWallet.fromMnemonic(MNEMONIC, 0, provider, accountAddress, txVersion);
  } else {
    let mnemonic = StarkNetWallet.generateSeed();
    return StarkNetWallet.fromMnemonic(mnemonic, 0, provider);
  }
}

program.command("balance [address] [token_address]").action(async (address: string, tokenAddress: string, options) => {
  let provider = getProvider(STARKNET_RPC_URL);
  let res = provider.getInvokeEstimateFee;
  if (address == undefined) {
    let wallet = getWalletFromConfig();
    let balanceBigNumber = await wallet.getBalance(tokenAddress);
    console.log(`Address ${wallet.getAddress()}`);
    console.log(`Balance ${ethers.formatEther(balanceBigNumber.toString())}`);
  } else {
    let balanceBigNumber = await StarkNetWallet.getBalance(address, provider, tokenAddress);
    console.log(`Address ${address}`);
    console.log(`Balance ${ethers.formatEther(balanceBigNumber.toString())}`);
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
  await wallet.deployAccount();
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
