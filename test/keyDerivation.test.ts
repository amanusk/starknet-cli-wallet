import { expect } from "chai";
import { KeyPair } from "starknet";
import { BN } from "bn.js";

import { getStarkPair } from "../src/keyDerivation";

describe("Testing key derivation from seed", async () => {
  it("Should return correct private key", async () => {
    // XXX NOTICE: DO NOT USE THIS SEED IN PRODUCTION XXX //
    let seed = "test test test test test test test test test test test junk";
    let kp: KeyPair = await getStarkPair(seed, 0);
    let priv = new BN(kp.priv);
    expect(priv.toString("hex")).to.equal("6a9c4ecd67b5a868c4e1ff108da4735c573881681e83aae0d2c9382a410857f");
  });
});
