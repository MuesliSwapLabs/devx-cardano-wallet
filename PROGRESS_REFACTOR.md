# Blockfrost API Refactoring Progress

## Overview
Refactoring the Blockfrost API integration to create a clean, type-safe client with proper error handling and separation of concerns.

## Completed Work

### 1. Address Types (`packages/shared/lib/types/addresses.ts`)
Created branded types for Cardano addresses with type safety:

**Types Created:**
- `StakeAddress` - for `stake1`/`stake_test1` addresses (delegation/rewards)
- `BaseAddress` - for `addr1q`/`addr_test1q` addresses (payments + staking)
- `EnterpriseAddress` - for `addr1v`/`addr_test1v` addresses (payments only)
- `PaymentAddress` - union type for `BaseAddress | EnterpriseAddress`
- `AnyAddress` - union type for all address types

**Helper Functions:**
- Type guards: `isStakeAddress()`, `isBaseAddress()`, `isEnterpriseAddress()`, `isPaymentAddress()`, `isValidCardanoAddress()`
- Safe constructors: `createStakeAddress()`, `createBaseAddress()`, `createEnterpriseAddress()`, `createPaymentAddress()`

**Features:**
- TypeScript brand types prevent mixing incompatible address types
- Runtime validation with helpful error messages

### 2. Blockfrost Response Types (`packages/shared/lib/types/blockfrost.ts`)
Created types matching the Blockfrost OpenAPI schema:

**Types Created:**
- `Amount` - unit/quantity pairs for asset amounts
- `AddressInfo` - response from `/addresses/{address}` endpoint
- `AddressTransaction` - response from `/addresses/{address}/transactions` endpoint
- `AddressUTXO` - response from `/addresses/{address}/utxos` endpoint
- `AccountInfo` - response from `/accounts/{stake_address}` endpoint
- `AccountAddress` - response from `/accounts/{stake_address}/addresses` endpoint
- `AccountAddressAsset` - response from `/accounts/{stake_address}/addresses/assets` endpoint
- `AssetMetadata` - metadata for off-chain asset information
- `AssetInfo` - response from `/assets/{asset}` endpoint
- `TransactionInfo` - response from `/txs/{hash}` endpoint (detailed transaction information)
- `TransactionInputUTXO` - input UTXO structure for `/txs/{hash}/utxos` endpoint
- `TransactionOutputUTXO` - output UTXO structure for `/txs/{hash}/utxos` endpoint
- `TransactionUTXOs` - response from `/txs/{hash}/utxos` endpoint (complete transaction input/output structure)
- `BlockfrostErrorResponse` - standard error response format

**Design Decisions:**
- Using exact field names from Blockfrost API for consistency
- All amounts are strings (as returned by API)
- Nullable fields properly typed (`stake_address: StakeAddress | null`)

### 3. Error Types (`packages/shared/lib/types/errors.ts`)
Comprehensive error handling system:

**Error Classes Created:**
- `BlockfrostError` - base error with status code, endpoint, and original error
- `BlockfrostBadRequestError` (400) - invalid request
- `BlockfrostPaymentRequiredError` (402) - exceeded daily limit
- `BlockfrostUnauthorizedError` (403) - invalid API key
- `BlockfrostNotFoundError` (404) - resource not found
- `BlockfrostAutoBannedError` (418) - auto-banned for flooding
- `BlockfrostQueueFullError` (425) - mempool/pin queue full
- `BlockfrostRateLimitError` (429) - rate limited
- `BlockfrostServerError` (500) - server error
- `NetworkError` (network/fetch failures) - connection issues

**Helper Functions:**
- `createBlockfrostError()` - factory to create appropriate error type based on status code

**Features:**
- All errors preserve original error context for debugging
- Specific error types enable targeted error handling in business logic

### 4. Blockfrost Client (`packages/blockchain-provider/lib/blockfrost-client.ts`)
Implemented the first endpoint with full type safety:

**Types/Classes Created:**
- `BlockfrostClientConfig` - client configuration (network, API key)
- `BlockfrostClient` - main API client class

**Methods Implemented:**
- `getAddressInfo()` - GET `/addresses/{address}` endpoint
- `getAddressTransactions()` - GET `/addresses/{address}/transactions` endpoint with pagination
- `getAddressUTXOs()` - GET `/addresses/{address}/utxos` endpoint with pagination
- `getAccountInfo()` - GET `/accounts/{stake_address}` endpoint
- `getAccountAddresses()` - GET `/accounts/{stake_address}/addresses` endpoint with pagination
- `getAccountAddressesAssets()` - GET `/accounts/{stake_address}/addresses/assets` endpoint with pagination
- `getAccountUTXOs()` - GET `/accounts/{stake_address}/utxos` endpoint with pagination
- `getAssetInfo()` - GET `/assets/{asset}` endpoint
- `getTransactionInfo()` - GET `/txs/{hash}` endpoint
- `getTransactionUTXOs()` - GET `/txs/{hash}/utxos` endpoint
- `makeRequest<T>()` - private HTTP request handler

**Features:**
- 1:1 mapping to Blockfrost API (no business logic)
- Type-safe: accepts appropriate address types (`PaymentAddress` for address endpoints, `StakeAddress` for account endpoints)
- Comprehensive error handling with structured error types
- Graceful error message parsing (JSON → text → statusText fallback)
- No retry logic (intentionally left for provider layer)
- Clean separation of network errors vs API errors

## Implementation Complete ✅

All 10 required Blockfrost API endpoints have been successfully implemented with full type safety and comprehensive documentation.

## Next Steps
1. Update `provider.ts` to use the new client instead of raw fetch calls
2. Remove duplicate API calls from `chrome-extension/src/background/wallet.ts`
3. Consolidate duplicate type definitions across packages

## Design Principles Established
- **Type Safety**: Union types for function parameters (`PaymentAddress` vs `StakeAddress`)
- **Error Handling**: Structured errors with context, no retry at client level
- **Separation of Concerns**: Client handles HTTP, provider handles business logic
- **API Fidelity**: 1:1 mapping with Blockfrost OpenAPI schema