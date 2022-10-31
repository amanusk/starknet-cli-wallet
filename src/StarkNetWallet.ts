import fs from "fs";
import { ensureEnvVar, uint256ToBigNumber, generateRandomStarkPrivateKey } from "./util";
import { Wallet, BigNumber } from "ethers";
import BN from "bn.js";
import { Contract, ec, json, stark, Signer, KeyPair, Account, Provider, number, uint256, constants } from "starknet";

import { FeederProvider } from "./ProviderConfig";
import { getStarkPair } from "./keyDerivation";

import * as dotenv from "dotenv";
dotenv.config();

function getProvider() {
  return new FeederProvider("http://127.0.0.1:5050");
}

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const MNEMONIC = process.env.MNEMONIC || "";

export class StarkNetWallet {
  static getAccount(index: number = 0): Account {
    let address = ensureEnvVar("ACCOUNT_ADDRESS");
    if (PRIVATE_KEY != null) {
      return StarkNetWallet.getAccountFromPk(address, PRIVATE_KEY);
    } else if (MNEMONIC != null) {
      return StarkNetWallet.getAccountFromMnemonic(address, MNEMONIC, index);
    }
    throw new Error("You must specify either PRIVATE_KEY or MNEMONIC");
  }

  static getAccountFromPk(address: string, pk: string): Account {
    let provider = getProvider();
    const starkKeyPair = ec.getKeyPair(pk);
    let account = new Account(provider, address, starkKeyPair);
    return account;
  }

  static getAccountFromMnemonic(address: string, mnemonic: string, index: number = 0): Account {
    let provider = getProvider();
    const starkKeyPair = getStarkPair(mnemonic, index);
    let account = new Account(provider, address, starkKeyPair);
    return account;
  }

  static async getBalance(address?: string, tokenAddress?: string): Promise<BigNumber> {
    let provider = getProvider();
    if (tokenAddress == null) {
      tokenAddress = ensureEnvVar("TOKEN_ADDRESS"); // todo: move to config per chain
    }
    if (address == null) {
      let account = StarkNetWallet.getAccount();
      address = account.address;
    }
    const erc20ABI = json.parse(fs.readFileSync("./src/interfaces/ERC20_abi.json").toString("ascii"));
    const erc20 = new Contract(erc20ABI, tokenAddress, provider);
    const balance = await erc20.balanceOf(address);
    // console.log(balance.balance);
    let balanceBigNumber = uint256ToBigNumber(balance.balance);
    return balanceBigNumber;
  }

  static async deployNewAccount(): Promise<Account> {
    // Deploy the Account contract and wait for it to be verified on StarkNet.
    console.log("Deployment Tx - Account Contract to StarkNet...");
    const compiledOZAccount = json.parse(fs.readFileSync("./artifacts/Account.json").toString("ascii"));

    let mnemonic = StarkNetWallet.generateSeed();

    let starkKeyPair = getStarkPair(mnemonic, 0);

    let starkKeyPub = ec.getStarkKey(starkKeyPair);

    let provider = getProvider();
    // TODO: replace with declare/deploy + print future address
    const accountResponse = await provider.deployContract({
      contract: compiledOZAccount,
      constructorCalldata: [starkKeyPub],
      addressSalt: starkKeyPub,
    });
    // Wait for the deployment transaction to be accepted on StarkNet
    console.log(
      "Waiting for Tx " + accountResponse.transaction_hash + " to be Accepted on Starknet - OZ Account Deployment...",
    );
    await provider.waitForTransaction(accountResponse.transaction_hash);
    console.log("✨ Account Deployed at " + accountResponse.contract_address + " !!");
    //Ready to be used !!!
    console.log(`MNEMONIC=${mnemonic}`);
    console.log(`PUBLIC_KEY=${starkKeyPub}`);
    console.log(`ACCOUNT_ADDRESS=${accountResponse.contract_address}`);
    let account = new Account(provider, accountResponse.contract_address, starkKeyPair);
    return account;
  }

  static generateSeed() {
    console.log("THIS IS A NEW ACCOUNT. Please fill in the MNEMONIC field in the .env file");
    let wallet = Wallet.createRandom();
    let mnemonic = wallet.mnemonic;
    console.log("12-word seed: " + mnemonic.phrase);
    return mnemonic.phrase;
  }

  static generatePk(): BigNumber {
    let pk = generateRandomStarkPrivateKey();
    console.log("PK generated", pk);
    return pk;
  }

  async transfer(recipientAddress: string, amount: BigNumber, tokenAddress?: string, decimals: number = 18) {
    let provider = await getProvider();

    if (tokenAddress == null) {
      tokenAddress = ensureEnvVar("TOKEN_ADDRESS");
    }

    const erc20ABI = json.parse(fs.readFileSync("./src/interfaces/ERC20_abi.json").toString("ascii"));
    let account = StarkNetWallet.getAccount();
    const erc20 = new Contract(erc20ABI, tokenAddress, account);

    const transferAmount = new BN(amount.toString());
    let uint256Amount = uint256.bnToUint256(transferAmount);

    // ///////// Optinally invoke contract directly ////////////////
    // const receipt = await erc20.transfer(recipientAddress, uint256Amount);
    // const { transaction_hash: transferTxHash } = await erc20.transfer(recipientAddress, uint256Amount);
    // console.log("Awaiting tx ", transferTxHash);
    // await provider.waitForTransaction(transferTxHash);
    // console.log("Tx mined ", transferTxHash);

    let estimateFee = await account.estimateFee({
      contractAddress: tokenAddress,
      entrypoint: "transfer",
      calldata: [recipientAddress, uint256Amount.low, uint256Amount.high],
    });
    console.log(estimateFee);

    // alternatively execute by calling the account execute function
    const { transaction_hash: transferTxHash } = await account.execute(
      {
        contractAddress: tokenAddress,
        entrypoint: "transfer",
        calldata: [recipientAddress, uint256Amount.low, uint256Amount.high],
      },
      undefined, // abi
      { maxFee: estimateFee.suggestedMaxFee },
    );
    console.log("Awaiting tx ", transferTxHash);
    await provider.waitForTransaction(transferTxHash);
    console.log("Tx mined ", transferTxHash);
  }
}
