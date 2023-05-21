import { expect } from "chai";
import { getStarkPk } from "../src/keyDerivation";

describe("Testing key derivation from seed", async () => {
  it("Should return correct private key", async () => {
    // XXX NOTICE: DO NOT USE THIS SEED IN PRODUCTION XXX //
    let seed = "test test test test test test test test test test test junk";
    let kp: string = getStarkPk(seed, 0);
    expect(kp.toString()).to.equal("0x588702548af02a83b11709fdc5bb827dfec168455112a7901efaf86322dbe48");
  });
});
