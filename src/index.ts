import fs from "fs";
import { ensureEnvVar, uint256ToBigNumber, generateRandomStarkPrivateKey } from "./util";
import { program } from "commander";
import { Wallet, providers, utils, BigNumber } from "ethers";
import BN from "bn.js";
import { Contract, ec, json, stark, Signer, KeyPair, Account, Provider, number, uint256, constants } from "starknet";

import { FeederProvider } from "./ProviderConfig";

import { StarkNetWallet } from "./StarkNetWallet";

import * as dotenv from "dotenv";
dotenv.config();

import { baseDerivationPath, getStarkPair } from "./keyDerivation";
let PATH = baseDerivationPath;

function getProvider() {
  return new FeederProvider("http://127.0.0.1:5050");
}

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const MNEMONIC = process.env.MNEMONIC || "";

program.command("balance [address] [token_address]").action(async (address: string, tokenAddress: string, options) => {
  if (address != "") {
    let wallet = new StarkNetWallet(MNEMONIC);
    let balanceBigNumber = await wallet.getBalance(tokenAddress);
    console.log(`Address ${wallet.getAddress()}`);
    console.log(`Balance ${utils.formatEther(balanceBigNumber)}`);
  } else {
    let balanceBigNumber = await StarkNetWallet.getBalance(address, tokenAddress);
    console.log(utils.formatEther(balanceBigNumber));
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
    let starknetWallet = new StarkNetWallet(MNEMONIC);
    await starknetWallet.transfer(recipientAddress, utils.parseUnits(amount, decimals));
  });

program.command("generate_seed").action(async options => {
  StarkNetWallet.generateSeed();
});

program.command("generate_pk").action(async options => {
  StarkNetWallet.generatePk();
});

program.command("address").action(async options => {
  let wallet = new StarkNetWallet(MNEMONIC);
  console.log(`Account address: ${wallet.getAddress()}`);
});

program.parse(process.argv);
