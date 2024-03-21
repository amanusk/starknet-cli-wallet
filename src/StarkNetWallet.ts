import fs from "fs";
import { generateRandomStarkPrivateKey, prettyPrintFee } from "./util";
import { ethers, Wallet } from "ethers";
import {
  Contract,
  json,
  Account,
  Uint256,
  uint256,
  hash,
  ProviderInterface,
  RPC,
  Provider,
  Call,
  cairo,
} from "starknet";

import { getStarkPk, getPubKey } from "./keyDerivation";

import * as dotenv from "dotenv";
dotenv.config();

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class StarkNetWallet {
  public account: Account;
  private privateKey: string;

  constructor(
    privateKey: string,
    provider: ProviderInterface,
    address?: string,
    accountClassHash?: string,
    txVersion = 2,
  ) {
    if (address == undefined && accountClassHash != undefined) {
      address = StarkNetWallet.computeAddressFromPk(privateKey, accountClassHash);
    }
    console.log(address);
    if (address == undefined) {
      console.log("Either address or contract class must be provided");
      process.exit(1);
    }
    this.account = StarkNetWallet.getAccountFromPk(address, privateKey, provider, txVersion);
    this.privateKey = privateKey;
    return;
  }

  static fromMnemonic(
    mnemonic: string,
    index: number = 0,
    provider: ProviderInterface,
    address?: string,
    accountClassHash?: string,
    txVersion = 2,
  ): StarkNetWallet {
    if (address == undefined && accountClassHash != undefined) {
      address = StarkNetWallet.computeAddressFromMnemonic(mnemonic, accountClassHash, index);
    }
    if (address == undefined) {
      console.log("Either address or contract class must be provided");
      process.exit(1);
    }
    const starkPk = getStarkPk(mnemonic, index);
    let newWallet = new StarkNetWallet(starkPk, provider, address);
    let account = StarkNetWallet.getAccountFromMnemonic(address, mnemonic, index, provider, txVersion);
    newWallet.account = account;
    return newWallet;
  }

  getPrivateKey() {
    return this.privateKey;
  }

  getPublicKey() {
    return this.account.signer.getPubKey();
  }

  getAddress() {
    return this.account.address;
  }

  static computeAddressFromMnemonic(mnemonic: string, accountClassHash: string, index = 0): string {
    const starkPk = getStarkPk(mnemonic, index);
    return this.computeAddressFromPk(starkPk, accountClassHash);
  }

  static computeAddressFromPk(pk: string, accountClassHash: string): string {
    let starkKeyPub = getPubKey(pk);
    return hash.calculateContractAddressFromHash(starkKeyPub, BigInt(accountClassHash), [starkKeyPub], 0);
  }

  static getAccountFromPk(address: string, pk: string, provider: ProviderInterface, txVersion = 2): Account {
    if (txVersion == 2) {
      return new Account(provider, address, pk, "1", RPC.ETransactionVersion.V2);
    } else if (txVersion == 3) {
      return new Account(provider, address, pk, "1", RPC.ETransactionVersion.V3);
    } else {
      console.log("Unsupported account version");
      process.exit(0);
    }
  }

  static getERC20Contract(tokenAddress: string, provider: ProviderInterface): Contract {
    const erc20ABI = json.parse(fs.readFileSync("./src/interfaces/ERC20_abi.json").toString("ascii"));
    const erc20 = new Contract(erc20ABI, tokenAddress, provider);
    return erc20;
  }

  static getAccountFromMnemonic(
    address: string,
    mnemonic: string,
    index: number = 0,
    provider: ProviderInterface,
    txVersion = 2,
  ): Account {
    const starkPk = getStarkPk(mnemonic, index);
    return this.getAccountFromPk(address, starkPk, provider, txVersion);
  }

  async getBalance(tokenAddress: string) {
    return StarkNetWallet.getBalance(this.account.address, this.account, tokenAddress);
  }

  static async getBalance(address: string, provider: ProviderInterface, tokenAddress: string): Promise<BigInt> {
    let erc20 = this.getERC20Contract(tokenAddress, provider);
    const balance = await erc20.balanceOf(address);
    let balanceBigNumber = uint256.uint256ToBN(balance.balance);
    return balanceBigNumber;
  }

  async deployAccount(accountClassHash: string): Promise<Account> {
    // Deploy the Account contract and wait for it to be verified on StarkNet.
    console.log("Deployment Tx - Account Contract to StarkNet...");

    let address = StarkNetWallet.computeAddressFromPk(this.getPrivateKey(), accountClassHash);
    console.log("Future Account Address", address);

    let estimateFee = await this.account.estimateAccountDeployFee({
      classHash: accountClassHash,
      constructorCalldata: [await this.account.signer.getPubKey()],
      addressSalt: await this.account.signer.getPubKey(),
      contractAddress: address,
    });
    prettyPrintFee(estimateFee);

    let accountResponse = await this.account.deployAccount({
      classHash: accountClassHash,
      constructorCalldata: [await this.account.signer.getPubKey()],
      addressSalt: await this.account.signer.getPubKey(),
      contractAddress: address,
    });

    // Wait for the deployment transaction to be accepted on StarkNet
    console.log(
      "Waiting for Tx " + accountResponse.transaction_hash + " to be Accepted on Starknet - OZ Account Deployment...",
    );
    await this.account.waitForTransaction(accountResponse.transaction_hash);
    console.log("Deployed account at", accountResponse.contract_address);

    return this.account;
  }

  static generateSeed() {
    console.log("THIS IS A NEW ACCOUNT. Please fill in the MNEMONIC field in the .env file");
    let wallet = Wallet.createRandom();
    if (wallet.mnemonic == null) {
      console.log("No mnemonic generated");
      process.exit(1);
    }
    let mnemonic = wallet.mnemonic;
    console.log("12-word seed: " + mnemonic.phrase);
    return mnemonic.phrase;
  }

  static generatePk(): BigInt {
    let pk = generateRandomStarkPrivateKey();
    console.log("PrivateKey generated", pk.toString());
    // console.log("PublicKey generated", getPubKey(pk.toString("hex")));
    return pk;
  }

  async transfer(recipientAddress: string, amount: BigInt, tokenAddress: string, decimals: number = 18) {
    let erc20 = StarkNetWallet.getERC20Contract(tokenAddress, this.account);
    let transferTk: Uint256 = cairo.uint256(amount.valueOf());
    let transferCall: Call = erc20.populate("transfer", {
      recipient: recipientAddress,
      amount: transferTk,
    });

    let estimateFee = await this.account.estimateInvokeFee(transferCall);
    prettyPrintFee(estimateFee);

    const { transaction_hash: transferTxHash } = await this.account.execute(
      transferCall,
      undefined, // abi
      { maxFee: estimateFee.suggestedMaxFee * 3n },
    );
    console.log("Awaiting tx ", transferTxHash);
    await this.account.waitForTransaction(transferTxHash);
    console.log("Tx mined ", transferTxHash);
  }

  async deploy(classHash: string, salt: string, unique: boolean, constructorArgs: string[]) {
    let estimateFee = await this.account.estimateDeployFee({
      classHash: classHash,
      salt: salt,
      unique: unique,
      constructorCalldata: constructorArgs.length > 0 ? this.toRawCallData(constructorArgs) : undefined,
    });
    prettyPrintFee(estimateFee);

    let res = await this.account.deployContract(
      {
        classHash: classHash,
        salt: salt,
        unique: unique,
        constructorCalldata: constructorArgs.length > 0 ? this.toRawCallData(constructorArgs) : undefined,
      },
      { maxFee: (estimateFee.suggestedMaxFee * 112n) / 100n },
    );
    let txHash = res.transaction_hash;

    console.log("Awaiting tx ", txHash);
    await this.account.waitForTransaction(txHash);
    console.log("Tx mined ", txHash);
    console.log("Deployed contract", res.contract_address);
  }

  async declareNewContract(filename: string, classHash?: string, casmFilename?: string, compiledClassHash?: string) {
    const compiledContract = json.parse(fs.readFileSync(filename).toString("ascii"));

    let casmContarct = undefined;
    if (casmFilename != null) {
      casmContarct = json.parse(fs.readFileSync(casmFilename).toString("ascii"));
    }

    let estimateFee = await this.account.estimateDeclareFee({
      contract: compiledContract,
      classHash,
      casm: casmContarct,
    });
    prettyPrintFee(estimateFee);

    const { transaction_hash: txHash, class_hash: classHashResult } = await this.account.declare(
      {
        contract: compiledContract,
        classHash,
        casm: casmContarct,
      },
      { maxFee: estimateFee.suggestedMaxFee * 5n },
    );

    console.log("Awaiting tx ", txHash);
    await this.account.waitForTransaction(txHash);
    console.log("Tx mined ", txHash, "Declared class", classHashResult);
  }

  async invoke(contractAddress: string, selector: string, calldata: string[]) {
    let call = {
      contractAddress: contractAddress,
      entrypoint: selector,
      calldata: this.toRawCallData(calldata),
    };

    let estimateFee = await this.account.estimateInvokeFee(call);
    prettyPrintFee(estimateFee);

    // alternatively execute by calling the account execute function
    const { transaction_hash: transferTxHash } = await this.account.execute(
      call,
      undefined, // abi
      { maxFee: estimateFee.suggestedMaxFee * 2n },
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
      rawCallData.push(BigInt(c).toString());
    }
    return rawCallData;
  }
}
