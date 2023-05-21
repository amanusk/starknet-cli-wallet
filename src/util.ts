import { ethers } from "ethers";
import { EstimateFee, encode } from "starknet";

export function ensureEnvVar(varName: string): string {
  if (!process.env[varName]) {
    throw new Error(`Env var ${varName} not set or empty`);
  }
  return process.env[varName] as string;
}

// Represents an integer in the range [0, 2^256).
export interface Uint256 {
  // The low 128 bits of the value.
  low: BigInt;
  // The high 128 bits of the value.
  high: BigInt;
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

export function generateRandomStarkPrivateKey(length = 63) {
  const characters = "0123456789ABCDEF";
  let result = "0x";
  for (let i = 0; i < length; ++i) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return BigInt(result);
}

export function prettyPrintFee(fee: EstimateFee) {
  console.log(`Overall Fee: ${ethers.formatEther(fee.overall_fee.toString())}`);
  if (fee.gas_consumed !== undefined) {
    console.log(`Gas Consumed: ${fee.gas_consumed.toString()}`);
  }
  if (fee.gas_price !== undefined) {
    console.log(`Gas Price: ${ethers.formatUnits(fee.gas_price.toString(), 9)}`);
  }
  if (fee.suggestedMaxFee !== undefined) {
    console.log(`Suggested Max Fee: ${ethers.formatEther(fee.suggestedMaxFee.toString())}`);
  }
}

// Copied from starknet.js
export function isASCII(str: string) {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(str);
}

// function to check if string has less or equal 31 characters
export function isShortString(str: string) {
  return str.length <= 31;
}

export function encodeShortString(str: string) {
  if (!isASCII(str)) throw new Error(`${str} is not an ASCII string`);
  if (!isShortString(str)) throw new Error(`${str} is too long`);
  return encode.addHexPrefix(str.replace(/./g, char => char.charCodeAt(0).toString(16)));
}

export function decodeShortString(str: string) {
  return encode.removeHexPrefix(str).replace(/.{2}/g, hex => String.fromCharCode(parseInt(hex, 16)));
}
