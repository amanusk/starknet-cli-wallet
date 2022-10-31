import { BigNumber, BigNumberish, constants } from "ethers";
import BN from "bn.js";

export function ensureEnvVar(varName: string): string {
  if (!process.env[varName]) {
    throw new Error(`Env var ${varName} not set or empty`);
  }
  return process.env[varName] as string;
}

// Represents an integer in the range [0, 2^256).
export interface Uint256 {
  // The low 128 bits of the value.
  low: BN;
  // The high 128 bits of the value.
  high: BN;
}

/**
 * Receives a hex address, converts it to bigint, converts it back to hex.
 * This is done to strip leading zeros.
 * @param address a hex string representation of an address
 * @returns an adapted hex string representation of the address
 */
function adaptAddress(address: string) {
  return "0x" + BigInt(address).toString(16);
}

// function to convert Uint256 to BN
export function uint256ToBigNumber(uint256: Uint256) {
  return BigNumber.from(uint256.high.toString()).shl(128).add(BigNumber.from(uint256.low.toString()));
}

// function to convert BN to Uint256
export function bigNumberToUint256(bignumber: BigNumber): Uint256 {
  return {
    low: new BN(bignumber.mask(128).toHexString()),
    high: new BN(bignumber.shr(128).toHexString()),
  };
}

export function generateRandomStarkPrivateKey(length = 63) {
  const characters = "0123456789ABCDEF";
  let result = "0x";
  for (let i = 0; i < length; ++i) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return BigNumber.from(result);
}
