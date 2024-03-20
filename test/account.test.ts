import { isBN } from "bn.js";
import chai from "chai";
import { Account, Contract, constants } from "starknet";
import { getERC20FeeContract, getStarknetWallet, getTestProvider } from "./fixtures";
import { StarkNetWallet } from "../src/StarkNetWallet";

const { expect } = chai;
const ADDRESS_ONE = "0x00000000000000000000000000000000000000000000000000000000000000001";

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
    await account.transfer(ADDRESS_ONE, 10n);
    let x = await erc20.balanceOf(ADDRESS_ONE);
    console.log(x);
    expect(x.balance.low).to.be.equal(10n);
  }).timeout(100000);
});
