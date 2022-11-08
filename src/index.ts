import fs from "fs";
import { ensureEnvVar, uint256ToBigNumber, generateRandomStarkPrivateKey } from "./util";
import { program } from "commander";
import { Wallet, providers, utils, BigNumber } from "ethers";
import BN from "bn.js";
import { Contract, ec, json, stark, Signer, KeyPair, Account, Provider, number, uint256, constants } from "starknet";
import { FeederProvider, StarkNetProvider, NetworkPreset } from "./ProviderConfig";

import { StarkNetWallet } from "./StarkNetWallet";

import * as dotenv from "dotenv";
dotenv.config();

import { baseDerivationPath, getStarkPair } from "./keyDerivation";
let PATH = baseDerivationPath;

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const MNEMONIC = process.env.MNEMONIC || "";
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;

// Load config
const NETWORK = process.env.NETWORK || "";
const RPC_URL = process.env.RPC_URL || "";

function getNetworkConfig(): NetworkPreset {
  if (NETWORK == "mainnet" || NETWORK == "mainnet-alpha") {
    return "mainnet-alpha";
  } else {
    return "goerli-alpha";
  }
}

function getProvider() {
  let rpcUrl = "http://localhost:5050";
  if (NETWORK == "devnet") {
    if (RPC_URL != "") {
      rpcUrl = RPC_URL;
    }
    console.log(`Using DEVNET with URL ${rpcUrl}`);
    return new FeederProvider(rpcUrl);
  }
  let network = getNetworkConfig();
  return new StarkNetProvider(network);
}

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
    let provider = await getProvider();

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
