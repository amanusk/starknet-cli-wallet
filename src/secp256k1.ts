// Common.js and ECMAScript Modules (ESM)
import { secp256k1 } from "@noble/curves/secp256k1";

const key = secp256k1.utils.randomPrivateKey();
const pub = secp256k1.getPublicKey(key);
const msg = new Uint8Array(32).fill(1);
const sig = secp256k1.sign(msg, key);
