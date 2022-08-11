import { BigNumber, BigNumberish, utils } from "ethers";
import { KeyPair, ec, number } from "starknet";

export const baseDerivationPath = "m/44'/9004'/0'/0";

export function getStarkPair(mnemonic: string, index: number): KeyPair {
  const masterNode = utils.HDNode.fromMnemonic(mnemonic);

  const fullPath = getPathForIndex(index, baseDerivationPath ?? "");
  const childNode = masterNode.derivePath(fullPath);
  const groundKey = grindKey(childNode.privateKey);
  const starkPair = ec.getKeyPair(groundKey);
  return starkPair;
}

export function getPathForIndex(index: number, baseDerivationPath: string): string {
  return `${baseDerivationPath}/${index}`;
}

// inspired/copied from https://github.com/authereum/starkware-monorepo/blob/51c5df19e7f98399a2f7e63d564210d761d138d1/packages/starkware-crypto/src/keyDerivation.ts#L85
export function grindKey(keySeed: string): string {
  const keyValueLimit = ec.ec.n;
  if (!keyValueLimit) {
    return keySeed;
  }
  const sha256EcMaxDigest = number.toBN(
    "1 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000",
    16,
  );
  const maxAllowedVal = sha256EcMaxDigest.sub(sha256EcMaxDigest.mod(keyValueLimit));

  // Make sure the produced key is devided by the Stark EC order,
  // and falls within the range [0, maxAllowedVal).
  let i = 0;
  let key;
  do {
    key = hashKeyWithIndex(keySeed, i);
    i++;
  } while (!key.lt(maxAllowedVal));

  return "0x" + key.umod(keyValueLimit).toString("hex");
}

function hashKeyWithIndex(key: string, index: number) {
  const payload = utils.concat([utils.arrayify(key), utils.arrayify(index)]);
  const hash = utils.sha256(payload);
  return number.toBN(hash);
}
