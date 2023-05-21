import { isBN } from "bn.js";
import chai from "chai";
// import typedDataExample from "../__mocks__/typedDataExample.json";
import { Account, Contract, Provider, stark } from "starknet";
// import { feeTransactionVersion } from "../src/utils/hash";
// import { toBN } from "../src/utils/number";
import { getERC20FeeContract, getTestAccount, getTestProvider } from "./fixtures";

const { expect } = chai;

describe("deploy and test Wallet", () => {
  const provider = getTestProvider();
  const account = getTestAccount(provider);
  let erc20: Contract;
  let erc20Address: string;
  let dapp: Contract;

  beforeEach(async () => {
    expect(account).to.be.instanceof(Account);

    erc20 = getERC20FeeContract(provider);

    erc20Address = erc20.address;

    it("reads balance of wallet", async () => {
      const x = await erc20.balanceOf(account.address);

      expect(BigInt(x[0].low)).to.be.equal(BigInt("1000000000000000000000"));
    }).timeout(100000);
  });
});
