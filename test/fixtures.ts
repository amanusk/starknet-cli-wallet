import fs from "fs";

import { Account, ProviderInterface, RpcProvider, ec, json, Contract } from "starknet";
import { CompiledContract, waitForTransactionOptions } from "starknet";
import { StarkNetWallet } from "../src/StarkNetWallet";
const readContract = (name: string): CompiledContract =>
  json.parse(fs.readFileSync(`./artifacts/${name}.json`).toString("ascii"));

export const compiledOpenZeppelinAccount = readContract("Account");

const DEFAULT_TEST_PROVIDER_BASE_URL = "http://127.0.0.1:5050/";
const DEFAULT_TEST_ACCOUNT_ADDRESS = "0x64b48806902a367c8598f4f95c305e8c1a1acba5f082d294a43793113115691"; // run `starknet-devnet --seed 0` and this will be the first account
const DEFAULT_TEST_ACCOUNT_PRIVATE_KEY = "0x71d7bb07b9a64f6f78ac4c816aff4da9";
const DEFAULT_FEE_TOKEN_ADDRESS = "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

const BASE_URL = process.env.TEST_PROVIDER_BASE_URL || DEFAULT_TEST_PROVIDER_BASE_URL;
const RPC_URL = process.env.TEST_RPC_URL ?? DEFAULT_TEST_PROVIDER_BASE_URL;

const IS_RPC = !!RPC_URL;
const IS_RPC_DEVNET = Boolean(RPC_URL && (RPC_URL.includes("localhost") || RPC_URL.includes("127.0.0.1")));
export const IS_DEVNET = IS_RPC_DEVNET;

export const getTestProvider = (): ProviderInterface => {
  const provider = new RpcProvider({ nodeUrl: RPC_URL });

  if (IS_DEVNET) {
    // accelerate the tests when running locally
    const originalWaitForTransaction = provider.waitForTransaction.bind(provider);
    provider.waitForTransaction = (txHash: string, { retryInterval }: waitForTransactionOptions = {}) => {
      return originalWaitForTransaction(txHash, { retryInterval: retryInterval || 1000 });
    };
  }

  return provider;
};

// test account with fee token balance
export const getTestAccount = (provider: ProviderInterface) => {
  let testAccountAddress = process.env.TEST_ACCOUNT_ADDRESS ?? DEFAULT_TEST_ACCOUNT_ADDRESS;
  let testAccountPrivateKey = process.env.TEST_ACCOUNT_PRIVATE_KEY ?? DEFAULT_TEST_ACCOUNT_PRIVATE_KEY;

  if (!IS_DEVNET) {
    console.log("Not devnet!!");
    if (!testAccountPrivateKey) {
      throw new Error("TEST_ACCOUNT_PRIVATE_KEY is not set");
    }

    if (!testAccountAddress) {
      throw new Error("TEST_ACCOUNT_ADDRESS is not set");
    }
  } else {
    testAccountAddress = DEFAULT_TEST_ACCOUNT_ADDRESS;
    testAccountPrivateKey = DEFAULT_TEST_ACCOUNT_PRIVATE_KEY;
  }

  return new Account(provider, testAccountAddress, testAccountPrivateKey);
};

// test account with fee token balance
export const getStarknetWallet = (provider: ProviderInterface) => {
  let testAccountAddress = process.env.TEST_ACCOUNT_ADDRESS ?? DEFAULT_TEST_ACCOUNT_ADDRESS;
  let testAccountPrivateKey = process.env.TEST_ACCOUNT_PRIVATE_KEY ?? DEFAULT_TEST_ACCOUNT_PRIVATE_KEY;

  if (!IS_DEVNET) {
    console.log("Not devnet!!");
    if (!testAccountPrivateKey) {
      throw new Error("TEST_ACCOUNT_PRIVATE_KEY is not set");
    }

    if (!testAccountAddress) {
      throw new Error("TEST_ACCOUNT_ADDRESS is not set");
    }
  } else {
    testAccountAddress = DEFAULT_TEST_ACCOUNT_ADDRESS;
    testAccountPrivateKey = DEFAULT_TEST_ACCOUNT_PRIVATE_KEY;
  }

  return new StarkNetWallet(testAccountPrivateKey, provider, testAccountAddress);
};

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);
export const describeIfSequencer = describeIf(IS_DEVNET);
export const describeIfRpc = describeIf(IS_RPC);
export const describeIfNotDevnet = describeIf(!IS_DEVNET);

export const getERC20FeeContract = (provider: ProviderInterface) => {
  const erc20ABI = json.parse(fs.readFileSync("./src/interfaces/ERC20_abi.json").toString("ascii"));
  const erc20 = new Contract(erc20ABI, DEFAULT_FEE_TOKEN_ADDRESS, provider);
  return erc20;
};
