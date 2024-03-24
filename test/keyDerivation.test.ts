import { expect } from "chai";
import { getStarkPk } from "../src/keyDerivation";

describe("Testing key derivation from seed", async () => {
  it("Should return correct private key", async () => {
    // XXX NOTICE: DO NOT USE THIS SEED IN PRODUCTION XXX //
    let seed = "test test test test test test test test test test test junk";
    let kp: string = getStarkPk(seed, 0);
    expect(kp.toString()).to.equal("0x7f0ecd1ec6159e6a7c70084aaa7d693d9113149b80ab72618602a185e2c1f2b");
  });
});
