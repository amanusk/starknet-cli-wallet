import fs from "fs";
import { ensureEnvVar, uint256ToBigNumber, generateRandomStarkPrivateKey } from "./util";
import { program } from "commander";
import { Wallet, providers, utils, BigNumber } from "ethers";
import BN from "bn.js";
import { Contract, ec, json, stark, Signer, KeyPair, Account, Provider, number, uint256, constants } from "starknet";
import * as dotenv from "dotenv";
dotenv.config();

import { baseDerivationPath } from "./keyDerivation";
let PATH = baseDerivationPath;

// let baseUrl = "https://alpha4.starknet.io";
let baseUrl = "http://127.0.0.1:5050";

const provider = new Provider({
  //sequencer: { network: "goerli-alpha" },
  // sequencer: { network: "mainnet-alpha" },
  sequencer: {
    baseUrl: `${baseUrl}`,
    chainId: constants.StarknetChainId.TESTNET, // same for devnet
    feederGatewayUrl: `${baseUrl}/feeder_gateway`,
    gatewayUrl: `${baseUrl}/gateway`,
  },
  // rpc: { nodeUrl: baseUrl },
});

async function getWallet(path: string): Promise<Account> {
  const starkKeyPair = ec.getKeyPair(ensureEnvVar("PRIVATE_KEY"));
  let signer = new Signer(starkKeyPair);
  // console.log("public key", signer.getPubKey());
  // we return the account, not the contract
  let account = new Account(provider, ensureEnvVar("ACCOUNT_ADDRESS"), starkKeyPair);

  // const compiledOZAccount = json.parse(fs.readFileSync("./artifacts/OZAccount.json").toString("ascii"));
  // const accountContract = new Contract(compiledOZAccount.abi, ensureEnvVar("ACCOUNT_ADDRESS"), account);
  return account;
}

program.command("balance [address] [token_address]").action(async (address: string, tokenAddress: string, options) => {
  if (tokenAddress == null) {
    tokenAddress = ensureEnvVar("TOKEN_ADDRESS"); // todo: move to config per chain
  }
  if (address == null) {
    let account = await getWallet(PATH);
    address = account.address;
  }
  // const compiledErc20 = json.parse(fs.readFileSync("./src/interfaces/ERC20.cairo/ERC20.json").toString("ascii"));
  const erc20ABI = json.parse(fs.readFileSync("./src/interfaces/ERC20_abi.json").toString("ascii"));
  const erc20 = new Contract(erc20ABI, tokenAddress, provider);
  const balance = await erc20.balanceOf(address);
  // console.log(balance.balance);
  let balanceBigNumber = uint256ToBigNumber(balance.balance);
  console.log(utils.formatEther(balanceBigNumber));
});

//function generateSeed(path?: string) {
//  let mnemonic = process.env.MNEMONIC;
//  if (mnemonic == null) {
//    console.log("THIS IS A TEMP ADDRESS. Please fill in the MNEMONIC field in the .env file");
//    let wallet = Wallet.createRandom();
//    let mnemonic = wallet.mnemonic;
//    console.log("12-word seed: " + mnemonic.phrase);
//  }
//}
//
//function generatePk() {
//  let pk = generateRandomStarkPrivateKey();
//  console.log("PK generated", pk);
//}

program
  .command("transfer <recipientAddress> <amount>")
  .option("-t --token <tokenAddress>")
  .option("-d --decimals <decimals>")
  .action(async (recipientAddress: string, amount: string, options) => {
    if (recipientAddress == null) {
      console.warn("Must specify a destination address to trasnfer to");
    }

    let tokenAddress = options.tokenAddress;
    if (tokenAddress == null) {
      tokenAddress = ensureEnvVar("TOKEN_ADDRESS");
    }

    const erc20ABI = json.parse(fs.readFileSync("./src/interfaces/ERC20_abi.json").toString("ascii"));
    let account = await getWallet(PATH);
    const erc20 = new Contract(erc20ABI, tokenAddress, account);

    const transferAmount = new BN(utils.parseEther(amount).toString());
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
  });

// program.command("generate_seed").action(async options => {
//   generateSeed(PATH);
// });
//
// program.command("generate_pk").action(async options => {
//   generatePk();
// });

program.command("address").action(async options => {
  let account = await getWallet(PATH);
  console.log(`Account address: ${account.address})`);
});

program.parse(process.argv);
