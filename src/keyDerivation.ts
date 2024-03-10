import { ethers } from "ethers";
// import { KeyPair, ec, number } from "starknet";
import { getStarkKey, utils, grindKey } from "micro-starknet";

export const baseDerivationPath = "m/44'/9004'/0'/0";

export function getStarkPk(mnemonic: string, index: number): string {
  const fullPath = getPathForIndex(index, baseDerivationPath);
  const masterNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, fullPath);
  const groundKey = grindKey(masterNode.privateKey);

  return getStarkKey(groundKey);
}

export function getPubKey(pk: string): string {
  return getStarkKey(pk);
}

export function getPathForIndex(index: number, baseDerivationPath: string): string {
  return `${baseDerivationPath}/${index}`;
}
