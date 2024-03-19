import fs from "fs";

import { Account, ProviderInterface, RpcProvider, ec, json, Contract } from "starknet";
import { CompiledContract, DeployContractPayload, waitForTransactionOptions } from "starknet";
import { encodeShortString } from "../src/util";
const readContract = (name: string): CompiledContract =>
  json.parse(fs.readFileSync(`./artifacts/${name}.json`).toString("ascii"));

export const compiledOpenZeppelinAccount = readContract("Account");

const DEFAULT_TEST_PROVIDER_BASE_URL = "http://127.0.0.1:5050/";
const DEFAULT_TEST_ACCOUNT_ADDRESS = "0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a"; // run `starknet-devnet --seed 0` and this will be the first account
const DEFAULT_TEST_ACCOUNT_PRIVATE_KEY = "0xe3e70682c2094cac629f6fbed82c07cd";
const DEFAULT_FEE_TOKEN_ADDRESS = "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

const BASE_URL = process.env.TEST_PROVIDER_BASE_URL || DEFAULT_TEST_PROVIDER_BASE_URL;
const RPC_URL = process.env.TEST_RPC_URL;

const IS_RPC = !!RPC_URL;
const IS_RPC_DEVNET = Boolean(RPC_URL && (RPC_URL.includes("localhost") || RPC_URL.includes("127.0.0.1")));
const IS_SEQUENCER = !IS_RPC;
const IS_SEQUENCER_DEVNET = !BASE_URL.includes("starknet.io");
export const IS_SEQUENCER_GOERLI = BASE_URL === "https://alpha4-2.starknet.io";
export const IS_DEVNET = IS_SEQUENCER ? IS_SEQUENCER_DEVNET : IS_RPC_DEVNET;

export const getTestProvider = (): ProviderInterface => {
  const provider = RPC_URL ? new RpcProvider({ nodeUrl: RPC_URL }) : new SequencerProvider({ baseUrl: BASE_URL });

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
  let testAccountAddress = process.env.TEST_ACCOUNT_ADDRESS;
  let testAccountPrivateKey = process.env.TEST_ACCOUNT_PRIVATE_KEY;

  if (!IS_DEVNET) {
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

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);
export const describeIfSequencer = describeIf(IS_DEVNET);
export const describeIfRpc = describeIf(IS_RPC);
export const describeIfNotDevnet = describeIf(!IS_DEVNET);

export const getERC20FeeContract = (provider: ProviderInterface) => {
  const erc20ABI = json.parse(fs.readFileSync("./src/interfaces/ERC20_abi.json").toString("ascii"));
  const erc20 = new Contract(erc20ABI, DEFAULT_FEE_TOKEN_ADDRESS, provider);
  return erc20;
};
