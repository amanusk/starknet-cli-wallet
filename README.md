# Basic StarkNet-JS wallet

I wouldn't trust any software/blockchain/dapp I cannot run from a command line.
This is a basic tool to run basic commands on a StarkNet contract, from a terminal.
The tool supports:

- Deterministic address derivation for StarkNet contract given a seed phrase and class hash
- Generate a new seed and deploy a contract to a predefined address
- At default works with the latest trialed-and-tested OZ contract

## Installation

```
yarn install
```

## Supported features

- generate seed
- print address
- deploy account at address
- get balance
- transfer (ETH by default)
- declare contract
- declare cairo 1 contract
- deploy contract via UDC
- invoke contract
- call contract

## Testing

To run integrations test with `starknet-devent`, run `starknet-devnet --seed 0` in another terminal.
Use `starknet-devnet>=0.5.3`

```
yarn test
```

More testing is required

Copy the resulting seed, public key and address to an `.env` file

## .env file

See example .env file for how to configure the wallet

## Fee Token Addresses

The fee token accorss all networks is ETH 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
