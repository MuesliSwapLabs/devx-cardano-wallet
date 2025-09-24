# DevX Cardano Wallet Documentation

## Cardano Naming Conventions

The Cardano ecosystem uses specific terminology that differs from other blockchains. This section explains our naming conventions:

### Accounts vs Addresses

**Accounts** (stake accounts):
- Use stake addresses (`stake1...` on mainnet, `stake_test1...` on testnet)
- Used for staking delegation, rewards, and governance voting
- API endpoints: `/accounts/*`
- Code naming: `AccountInfo`, `getAccountInfo()`, `StakeAddress`

**Addresses** (payment addresses):
- Use payment addresses (`addr1...` on mainnet, `addr_test1...` on testnet)
- Used for sending/receiving ADA and native tokens
- API endpoints: `/addresses/*`
- Code naming: `AddressInfo`, `getAddressInfo()`, `PaymentAddress`

### Examples

```typescript
// Stake account operations (delegation, rewards)
const accountInfo: AccountInfo = await client.getAccountInfo(stakeAddress);
const delegation = accountInfo.pool_id; // Current delegation
const rewards = accountInfo.withdrawable_amount; // Available rewards

// Get payment addresses associated with a stake account
const accountAddresses: AccountAddress[] = await client.getAccountAddresses(stakeAddress);
const paymentAddress = accountAddresses[0].address;

// Payment address operations (transactions, UTXOs)
const addressInfo: AddressInfo = await client.getAddressInfo(paymentAddress);
const balance = addressInfo.amount; // Current balance
const utxos = await client.getAddressUTXOs(paymentAddress); // Spendable UTXOs
```

This naming convention helps developers immediately understand the Cardano-specific concepts and prevents mixing incompatible address types.

### Mangled/Franken Addresses

**What they are**: Addresses where the payment key (spending control) and stake key (delegation control) come from different wallets. Since Cardano addresses are constructed from public keys, anyone can create an address combining keys from different sources.

**Example**: Alice could create an address using Bob's payment key + Alice's stake key. Bob controls spending, but Alice controls staking rewards.

**Why wallet extensions don't have this problem**:
- **New wallets**: Both payment and stake keys derive from the same seed phrase
- **Imported wallets**: Seed phrase import ensures both keys belong to the same wallet
- **Our assumption**: We assume no mangled addresses exist in our wallet implementation

**When it matters**:
- DApps accepting arbitrary external addresses
- Services using stake addresses for identity/authentication
- Less relevant for wallet extensions without staking features

The Blockfrost API warning about addresses "not necessarily being owned by the same user" refers to this edge case, but doesn't apply to properly generated wallet addresses.

## TypeScript Types & Classes Reference

### Address Types (`packages/shared/lib/types/addresses.ts`)
**Branded Types:**
- `StakeAddress` - for `stake1`/`stake_test1` addresses (delegation/rewards)
- `BaseAddress` - for `addr1q`/`addr_test1q` addresses (payments + staking)
- `EnterpriseAddress` - for `addr1v`/`addr_test1v` addresses (payments only)
- `PaymentAddress` - union of `BaseAddress | EnterpriseAddress`
- `AnyAddress` - union of all address types

**Helper Functions:**
- `isStakeAddress()`, `isBaseAddress()`, `isEnterpriseAddress()`, `isPaymentAddress()`, `isValidCardanoAddress()`
- `createStakeAddress()`, `createBaseAddress()`, `createEnterpriseAddress()`, `createPaymentAddress()`

### Blockfrost API Types (`packages/shared/lib/types/blockfrost.ts`)
**Interfaces:**
- `Amount` - unit/quantity pair for aggregated asset amounts
- `AddressInfo` - response from `/addresses/{address}` endpoint
- `AddressTransaction` - response from `/addresses/{address}/transactions` endpoint
- `AddressUTXO` - response from `/addresses/{address}/utxos` endpoint (individual UTXOs)
- `AccountInfo` - response from `/accounts/{stake_address}` endpoint (stake account info)
- `AccountAddress` - response from `/accounts/{stake_address}/addresses` endpoint (payment addresses for stake account)
- `AccountAddressAsset` - response from `/accounts/{stake_address}/addresses/assets` endpoint (aggregated assets for stake account)
- `AssetMetadata` - metadata for off-chain asset information (name, description, ticker, logo, etc.)
- `AssetInfo` - response from `/assets/{asset}` endpoint (comprehensive native asset information)
- `TransactionInfo` - response from `/txs/{hash}` endpoint (detailed transaction information with counts and metadata)
- `TransactionInputUTXO` - input UTXO structure for `/txs/{hash}/utxos` endpoint (with collateral/reference flags)
- `TransactionOutputUTXO` - output UTXO structure for `/txs/{hash}/utxos` endpoint (with consumed tracking)
- `TransactionUTXOs` - response from `/txs/{hash}/utxos` endpoint (complete transaction input/output structure)
- `BlockfrostErrorResponse` - standard API error response format

### Error Classes (`packages/shared/lib/types/errors.ts`)
**Runtime Error Classes:**
- `BlockfrostError` - base error class
- `BlockfrostBadRequestError` (400) - invalid request
- `BlockfrostPaymentRequiredError` (402) - exceeded daily limit
- `BlockfrostUnauthorizedError` (403) - invalid API key
- `BlockfrostNotFoundError` (404) - resource not found
- `BlockfrostAutoBannedError` (418) - auto-banned for flooding
- `BlockfrostQueueFullError` (425) - mempool/pin queue full
- `BlockfrostRateLimitError` (429) - rate limited
- `BlockfrostServerError` (500) - server error
- `NetworkError` - connection/network issues

**Helper Functions:**
- `createBlockfrostError()` - factory to create appropriate error class based on status code

### Blockfrost Client (`packages/blockchain-provider/lib/blockfrost-client.ts`)
**Classes:**
- `BlockfrostClient` - main API client class

**Interfaces:**
- `BlockfrostClientConfig` - client configuration

**Blockfrost API Endpoints:**
- `getAddressInfo()` → `/addresses/{address}`: Get current balance and metadata for a payment address
- `getAddressTransactions()` → `/addresses/{address}/transactions`: Get transaction history for a payment address (with pagination)
- `getAddressUTXOs()` → `/addresses/{address}/utxos`: Get current unspent UTXOs at a specific payment address
- `getAccountInfo()` → `/accounts/{stake_address}`: Get stake account information (delegation status, rewards, withdrawals)
- `getAccountAddresses()` → `/accounts/{stake_address}/addresses`: Get all payment addresses associated with a stake address
- `getAccountAddressesAssets()` → `/accounts/{stake_address}/addresses/assets`: Get aggregated assets across all payment addresses for a stake address
- `getAccountUTXOs()` → `/accounts/{stake_address}/utxos`: Get current unspent UTXOs from all payment addresses associated with a stake address
- `getAssetInfo()` → `/assets/{asset}`: Get detailed information about a specific native asset (metadata, supply, minting history)
- `getTransactionInfo()` → `/txs/{hash}`: Get detailed transaction information (amounts, fees, counts, smart contract execution status)
- `getTransactionUTXOs()` → `/txs/{hash}/utxos`: Get the inputs and outputs of a specific transaction (what was consumed vs created)

## Cardano Address Generation

### Cardano Address Generation Summary

In Cardano, addresses are generated from a seed phrase (mnemonic words like "abandon ability able about above absent...") using hierarchical deterministic wallets (BIP-39/SLIP-0010/ED25519-BIP32 standards).

1. **Derive Root Key**: Convert seed phrase to a single root private key (e.g., ed25519_sk1...).

2. **Derive Key Pairs**: From root, generate:
   - **Payment key pairs**: Multiple private/public keys for transactions (e.g., private: ed25519_sk1..., public: ed25519_pk1...). Typically N pairs for privacy.
   - **Stake key pair**: Usually one private/public key for delegation/rewards (e.g., private: ed25519_sk1..., public: ed25519_pk1...).

   These "pairs" refer to matched private/public keys derived via hardened paths (e.g., m/1852'/1815'/0'/0/i for payment, m/1852'/1815'/0'/2/0 for stake).

3. **Generate Addresses**: Bech32-encode hashes of public keys (no need to store privates separately—derive from seed on-demand):
   - **Stake address** (`stake1...` / `stake_test1...`): Bech32(hash(stake public key)). For delegation/rewards only; no payments.
   - **Enterprise address** (`addr1v...` / `addr_test1v...`): Bech32(hash(payment public key)). For payments only; no staking.
   - **Base address** (`addr1q...` / `addr_test1q...`): Bech32(hash(payment public key) + hash(stake public key)). For both payments and staking/rewards.