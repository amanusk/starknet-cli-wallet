import { isBN } from "bn.js";
import chai from "chai";
import { Account, Contract, constants } from "starknet";
import { getERC20FeeContract, getStarknetWallet, getTestProvider } from "./fixtures";
import { StarkNetWallet } from "../src/StarkNetWallet";

const { expect } = chai;
const ADDRESS_ONE = "0x00000000000000000000000000000000000000000000000000000000000000001";
const ACCOUNT_CLASS_HASH = "0x0450f568a8cb6ea1bcce446355e8a1c2e5852a6b8dc3536f495cdceb62e8a7e2";
export const DEFAULT_TOKEN_ADDRESS = "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
export const DEFAULT_STRK_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

describe("deploy and test Wallet", () => {
  const provider = getTestProvider();
  const account = getStarknetWallet(provider);
  let erc20: Contract;
  let erc20Address: string;
  let dapp: Contract;

  beforeEach(async () => {
    expect(account).to.be.instanceof(StarkNetWallet);
    erc20 = getERC20FeeContract(provider);
    erc20Address = erc20.address;
  });

  it("Checks transfer", async function () {
    await account.transfer(ADDRESS_ONE, 10n, DEFAULT_TOKEN_ADDRESS);
    let x = await erc20.balanceOf(ADDRESS_ONE);
    expect(x.balance.low).to.be.equal(10n);
  }).timeout(100000);

  it("Checks declare", async function () {
    await account.declareNewContract(
      "./test/artifacts/openzeppelin_Account.contract_class.json",
      undefined,
      "./test/artifacts/openzeppelin_Account.compiled_contract_class.json",
    );
    let x = await provider.getClassByHash(ACCOUNT_CLASS_HASH);
    expect(x).to.be.not.null;
  }).timeout(100000);

  it("Checks deploy account", async function () {
    let mnemonic = "test test test test test test test test test test test junk";
    let expectedAddress = StarkNetWallet.computeAddressFromMnemonic(mnemonic, ACCOUNT_CLASS_HASH);
    let newWallet = StarkNetWallet.fromMnemonic(mnemonic, 0, provider, expectedAddress);
    await account.transfer(expectedAddress, 1000000000000000000n, DEFAULT_TOKEN_ADDRESS);
    await newWallet.deployAccount(ACCOUNT_CLASS_HASH);
    let c = await provider.getClassAt(expectedAddress);
    expect(c).to.be.equal(ACCOUNT_CLASS_HASH);
  }).timeout(100000);
});
