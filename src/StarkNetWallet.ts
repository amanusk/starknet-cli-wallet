import fs from "fs";
import { ensureEnvVar, uint256ToBigNumber, generateRandomStarkPrivateKey, prettyPrintFee } from "./util";
import { Wallet, BigNumber, utils } from "ethers";
import BN from "bn.js";
import { Contract, json, Account, Provider, uint256, hash, ProviderInterface, Signer } from "starknet";

import { getPublicKey, getStarkKey, pedersen, sign, verify } from "@noble/curves/stark";

import { getStarkPk } from "./keyDerivation";

import * as dotenv from "dotenv";
dotenv.config();

// TODO: calculate this
const ACCOUNT_CLASS_HASH = "0x4d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f";
const DEFAULT_TOKEN_ADDRESS = "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

export class StarkNetWallet {
  public account: Account;

  constructor(privateKey: string, provider: ProviderInterface, address?: string) {
    if (address == undefined) {
      address = StarkNetWallet.computeAddressFromPk(privateKey);
    }
    this.account = StarkNetWallet.getAccountFromPk(address, privateKey, provider);
    return;
  }

  getAddress() {
    return this.account.address;
  }

  static computeAddressFromMnemonic(mnemonic: string, index = 0): string {
    const starkPk = getStarkPk(mnemonic, index);
    let starkKeyPub = getStarkKey(starkPk);
    return hash.calculateContractAddressFromHash(starkKeyPub, ACCOUNT_CLASS_HASH, [starkKeyPub], 0);
  }

  static computeAddressFromPk(pk: string): string {
    let starkKeyPub = getStarkKey(pk);
    return hash.calculateContractAddressFromHash(starkKeyPub, ACCOUNT_CLASS_HASH, [starkKeyPub], 0);
  }

  static getAccountFromPk(address: string, pk: string, provider: ProviderInterface): Account {
    let account = new Account(provider, address, pk);
    return account;
  }

  static fromMnemonic(
    mnemonic: string,
    index: number = 0,
    provider: ProviderInterface,
    address?: string,
  ): StarkNetWallet {
    if (address == undefined) {
      address = StarkNetWallet.computeAddressFromMnemonic(mnemonic, index);
    }
    let newWallet = new StarkNetWallet("0x01", provider);
    let account = StarkNetWallet.getAccountFromMnemonic(address, mnemonic, index, provider);
    newWallet.account = account;
    return newWallet;
  }

  static getAccountFromMnemonic(
    address: string,
    mnemonic: string,
    index: number = 0,
    provider: ProviderInterface,
  ): Account {
    const starkPk = getStarkPk(mnemonic, index);
    let account = new Account(provider, address, starkPk);
    return account;
  }

  async getBalance(tokenAddress?: string) {
    return StarkNetWallet.getBalance(this.account.address, this.account, tokenAddress);
  }

  static async getBalance(address: string, provider: ProviderInterface, tokenAddress?: string): Promise<BigNumber> {
    if (tokenAddress == null) {
      tokenAddress = DEFAULT_TOKEN_ADDRESS;
    }
    const erc20ABI = json.parse(fs.readFileSync("./src/interfaces/ERC20_abi.json").toString("ascii"));
    const erc20 = new Contract(erc20ABI, tokenAddress, provider);
    const balance = await erc20.balanceOf(address);
    let balanceBigNumber = uint256ToBigNumber(balance.balance);
    return balanceBigNumber;
  }

  // NOTICE: this method will be deprecated once DEPLOY is not working
  // static async deployNewAccount(mnemonic: string, provider: ProviderInterface): Promise<Account> {
  //   // Deploy the Account contract and wait for it to be verified on StarkNet.
  //   console.log("Deployment Tx - Account Contract to StarkNet...");
  //   const compiledOZAccount = json.parse(fs.readFileSync("./artifacts/Account.json").toString("ascii"));

  //   let starkPk = getStarkPair(mnemonic, 0);

  //   let starkKeyPub = ec.getStarkKey(starkPk);

  //   let futureAccountAddress = hash.calculateContractAddressFromHash(starkKeyPub, ACCOUNT_CLASS_HASH, [starkKeyPub], 0);

  //   console.log("Future Account Address", futureAccountAddress);

  //   // TODO: replace with declare/deploy + print future address
  //   const accountResponse = await provider.deployContract({
  //     contract: compiledOZAccount,
  //     constructorCalldata: [starkKeyPub],
  //     addressSalt: starkKeyPub,
  //   });
  //   // Wait for the deployment transaction to be accepted on StarkNet
  //   console.log(
  //     "Waiting for Tx " + accountResponse.transaction_hash + " to be Accepted on Starknet - OZ Account Deployment...",
  //   );
  //   await provider.waitForTransaction(accountResponse.transaction_hash);
  //   console.log("✨ Account Deployed at " + accountResponse.contract_address + " !!");
  //   //Ready to be used !!!
  //   console.log(`MNEMONIC=${mnemonic}`);
  //   console.log(`PUBLIC_KEY=${starkKeyPub}`);
  //   console.log(`ACCOUNT_ADDRESS=${accountResponse.contract_address}`);
  //   let account = new Account(provider, accountResponse.contract_address, starkPk);
  //   return account;
  // }

  static async deployPrefundedAccount(
    address: string,
    mnemonic: string,
    provider: ProviderInterface,
  ): Promise<Account> {
    // Deploy the Account contract and wait for it to be verified on StarkNet.
    console.log("Deployment Tx - Account Contract to StarkNet...");

    let starkPk = getStarkPk(mnemonic, 0);

    let starkKeyPub = getStarkKey(starkPk);

    let futureAccountAddress = hash.calculateContractAddressFromHash(starkKeyPub, ACCOUNT_CLASS_HASH, [starkKeyPub], 0);

    console.log("Future Account Address", futureAccountAddress);

    console.log("StarkPk", starkPk);
    let futureAccount = new Account(provider, futureAccountAddress, starkPk);

    let estimateFee = await futureAccount.estimateAccountDeployFee({
      classHash: ACCOUNT_CLASS_HASH,
      constructorCalldata: [starkKeyPub],
      addressSalt: starkKeyPub,
      contractAddress: futureAccountAddress,
    });
    prettyPrintFee(estimateFee);

    let accountResponse = await futureAccount.deployAccount({
      classHash: ACCOUNT_CLASS_HASH,
      constructorCalldata: [starkKeyPub],
      addressSalt: starkKeyPub,
      contractAddress: futureAccountAddress,
    });

    // Wait for the deployment transaction to be accepted on StarkNet
    console.log(
      "Waiting for Tx " + accountResponse.transaction_hash + " to be Accepted on Starknet - OZ Account Deployment...",
    );

    return futureAccount;
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

  async transfer(recipientAddress: string, amount: BN, tokenAddress?: string, decimals: number = 18) {
    if (tokenAddress == null) {
      tokenAddress = DEFAULT_TOKEN_ADDRESS;
    }

    const erc20ABI = json.parse(fs.readFileSync("./src/interfaces/ERC20_abi.json").toString("ascii"));
    const erc20 = new Contract(erc20ABI, tokenAddress, this.account);
    console.log("Amount", amount.toNumber());

    let uint256Amount = uint256.bnToUint256(amount.toNumber());
    console.log("uint amount", uint256Amount, uint256Amount.high, uint256Amount.low);

    let estimateFee = await this.account.estimateInvokeFee({
      contractAddress: tokenAddress,
      entrypoint: "transfer",
      calldata: [recipientAddress, uint256Amount.low, uint256Amount.high],
    });
    prettyPrintFee(estimateFee);

    // alternatively execute by calling the account execute function
    const { transaction_hash: transferTxHash } = await this.account.execute(
      {
        contractAddress: tokenAddress,
        entrypoint: "transfer",
        calldata: [recipientAddress, uint256Amount.low, uint256Amount.high],
      },
      undefined, // abi
      { maxFee: estimateFee.suggestedMaxFee },
    );
    console.log("Awaiting tx ", transferTxHash);
    await this.account.waitForTransaction(transferTxHash);
    console.log("Tx mined ", transferTxHash);
  }

  async deployNewContract(classHash: string, constructorArgs: string[]) {
    // TODO: compute account deploy address
    const { transaction_hash: txHash } = await this.account.deploy({
      classHash: classHash,
      salt: "",
      unique: false,
      constructorCalldata: this.toRawCallData(constructorArgs),
    });

    console.log("Awaiting tx ", txHash);
    await this.account.waitForTransaction(txHash);
    console.log("Tx mined ", txHash);
  }

  async declareNewContract(filename: string) {
    const compiledContract = json.parse(fs.readFileSync(filename).toString("ascii"));

    let estimateFee = await this.account.estimateDeclareFee({
      contract: compiledContract,
    });
    prettyPrintFee(estimateFee);

    const { transaction_hash: txHash } = await this.account.declare({
      contract: compiledContract,
    });

    console.log("Awaiting tx ", txHash);
    await this.account.waitForTransaction(txHash);
    console.log("Tx mined ", txHash);
  }

  async invoke(contractAddress: string, selector: string, calldata: string[]) {
    let call = {
      contractAddress: contractAddress,
      entrypoint: selector,
      calldata: this.toRawCallData(calldata),
    };

    console.log("Call", call);

    let estimateFee = await this.account.estimateInvokeFee(call);
    prettyPrintFee(estimateFee);

    // alternatively execute by calling the account execute function
    const { transaction_hash: transferTxHash } = await this.account.execute(
      call,
      undefined, // abi
      { maxFee: estimateFee.suggestedMaxFee },
    );
    console.log("Awaiting tx ", transferTxHash);
    await this.account.waitForTransaction(transferTxHash);
    console.log("Tx mined ", transferTxHash);
  }

  async call(contractAddress: string, selector: string, calldata: string[]) {
    let result = await this.account.callContract({
      contractAddress: contractAddress,
      entrypoint: selector,
      calldata: this.toRawCallData(calldata),
    });
    console.log("Result", result);
  }

  toRawCallData(calldata: string[]): string[] {
    let rawCallData = new Array<string>();

    for (let c of calldata) {
      rawCallData.push(BigNumber.from(c).toString());
    }
    return rawCallData;
  }
}
