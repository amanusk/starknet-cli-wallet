import fs from "fs";
import { ensureEnvVar, generateRandomStarkPrivateKey, prettyPrintFee } from "./util";
import { ethers, Wallet } from "ethers";
import { Contract, json, Account, uint256, hash, ProviderInterface } from "starknet";

import { getStarkPk, getPubKey } from "./keyDerivation";

import * as dotenv from "dotenv";
dotenv.config();

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// TODO: calculate this
// Cairo 0 Old
// const ACCOUNT_CLASS_HASH = "0x4d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f";
// Cairo 0
// const ACCOUNT_CLASS_HASH = "0x05c478ee27f2112411f86f207605b2e2c58cdb647bac0df27f660ef2252359c6";
// New Cairo
const ACCOUNT_CLASS_HASH = "0x00903752516de5c04fe91600ca6891e325278b2dfc54880ae11a809abb364844";
const DEFAULT_TOKEN_ADDRESS = "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
const UDC_ADDRESS = "0x041a78e741e5af2fec34b695679bc6891742439f7afb8484ecd7766661ad02bf";

export class StarkNetWallet {
  public account: Account;
  private privateKey: string;

  constructor(privateKey: string, provider: ProviderInterface, address?: string) {
    if (address == undefined) {
      address = StarkNetWallet.computeAddressFromPk(privateKey);
    }
    this.account = StarkNetWallet.getAccountFromPk(address, privateKey, provider);
    this.privateKey = privateKey;
    return;
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

  static computeAddressFromMnemonic(mnemonic: string, index = 0): string {
    const starkPk = getStarkPk(mnemonic, index);
    let starkKeyPub = getPubKey(starkPk);
    return hash.calculateContractAddressFromHash(starkKeyPub, ACCOUNT_CLASS_HASH, [starkKeyPub], 0);
  }

  static computeAddressFromPk(pk: string): string {
    let starkKeyPub = getPubKey(pk);
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
    const starkPk = getStarkPk(mnemonic, index);
    let newWallet = new StarkNetWallet(starkPk, provider);
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

  static async getBalance(address: string, provider: ProviderInterface, tokenAddress?: string): Promise<BigInt> {
    if (tokenAddress == null) {
      tokenAddress = DEFAULT_TOKEN_ADDRESS;
    }
    const erc20ABI = json.parse(fs.readFileSync("./src/interfaces/ERC20_abi.json").toString("ascii"));
    const erc20 = new Contract(erc20ABI, tokenAddress, provider);
    const balance = await erc20.balanceOf(address);
    let balanceBigNumber = uint256.uint256ToBN(balance.balance);
    return balanceBigNumber;
  }

  async deployAccount(): Promise<Account> {
    // Deploy the Account contract and wait for it to be verified on StarkNet.
    console.log("Deployment Tx - Account Contract to StarkNet...");

    let address = StarkNetWallet.computeAddressFromPk(this.getPrivateKey());
    console.log("Future Account Address", address);

    let estimateFee = await this.account.estimateAccountDeployFee({
      classHash: ACCOUNT_CLASS_HASH,
      constructorCalldata: [await this.account.signer.getPubKey()],
      addressSalt: await this.account.signer.getPubKey(),
      contractAddress: address,
    });
    prettyPrintFee(estimateFee);

    let accountResponse = await this.account.deployAccount({
      classHash: ACCOUNT_CLASS_HASH,
      constructorCalldata: [await this.account.signer.getPubKey()],
      addressSalt: await this.account.signer.getPubKey(),
      contractAddress: address,
    });

    // Wait for the deployment transaction to be accepted on StarkNet
    console.log(
      "Waiting for Tx " + accountResponse.transaction_hash + " to be Accepted on Starknet - OZ Account Deployment...",
    );

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

  async transfer(recipientAddress: string, amount: BigInt, tokenAddress?: string, decimals: number = 18) {
    if (tokenAddress == null) {
      tokenAddress = DEFAULT_TOKEN_ADDRESS;
    }

    const erc20ABI = json.parse(fs.readFileSync("./src/interfaces/ERC20_abi.json").toString("ascii"));
    const erc20 = new Contract(erc20ABI, tokenAddress, this.account);

    let uint256Amount = uint256.bnToUint256(amount.valueOf());

    let estimateFee = await this.account.estimateInvokeFee({
      contractAddress: tokenAddress,
      entrypoint: "transfer",
      calldata: [recipientAddress, uint256Amount.low, uint256Amount.high],
    });
    prettyPrintFee(estimateFee);

    const { transaction_hash: transferTxHash } = await this.account.execute(
      {
        contractAddress: tokenAddress,
        entrypoint: "transfer",
        calldata: [recipientAddress, uint256Amount.low, uint256Amount.high],
      },
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

    const { transaction_hash: txHash } = await this.account.deploy(
      {
        classHash: classHash,
        salt: salt,
        unique: unique,
        constructorCalldata: constructorArgs.length > 0 ? this.toRawCallData(constructorArgs) : undefined,
      },
      { maxFee: (estimateFee.suggestedMaxFee * 112n) / 100n },
    );

    console.log("Awaiting tx ", txHash);
    await this.account.waitForTransaction(txHash);
    console.log("Tx mined ", txHash);
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

    console.log("Call", call);

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
