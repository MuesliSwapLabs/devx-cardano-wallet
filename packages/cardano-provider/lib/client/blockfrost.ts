// Blockfrost API Client - 1:1 mapping of Blockfrost API endpoints

import type { PaymentAddress, StakeAddress } from '@extension/shared/lib/types/addresses';
import type {
  AddressInfo,
  AddressTransaction,
  AddressUTXO,
  AccountInfo,
  AccountAddress,
  AccountAddressAsset,
  AssetInfo,
  TransactionInfo,
  TransactionUTXOs,
  BlockInfo,
  BlockfrostErrorResponse,
} from '@extension/shared/lib/types/blockfrost';
import { BlockfrostError, NetworkError, createBlockfrostError } from '@extension/shared/lib/types/errors';

// Network configuration
const BLOCKFROST_API_URLS = {
  Mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0',
  Preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
} as const;

// Blockfrost client configuration
export interface BlockfrostClientConfig {
  network: 'Mainnet' | 'Preprod';
  apiKey: string;
}

export class BlockfrostClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly network: 'Mainnet' | 'Preprod';
  private lastRequestTime: number = 0;
  private readonly rateLimitDelay: number = 100; // 100ms = 10 requests/second

  constructor(config: BlockfrostClientConfig) {
    this.baseUrl = BLOCKFROST_API_URLS[config.network];
    this.apiKey = config.apiKey;
    this.network = config.network;
  }

  /**
   * Internal method to make HTTP requests to Blockfrost API
   * Includes automatic rate limiting (10 requests/second)
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    // Rate limiting: ensure 100ms between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delayNeeded = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }

    this.lastRequestTime = Date.now();

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          project_id: this.apiKey,
        },
      });

      // Handle error responses
      if (!response.ok) {
        let errorMessage = `Request failed: ${response.statusText}`;
        let originalError: BlockfrostErrorResponse | string = response.statusText;

        // Try to parse error response body
        try {
          const errorBody = await response.text();
          if (errorBody) {
            // Try to parse as JSON first
            try {
              const parsedError: BlockfrostErrorResponse = JSON.parse(errorBody);
              errorMessage = parsedError.message || errorMessage;
              originalError = parsedError;
            } catch {
              // If not JSON, use the text as-is
              errorMessage = errorBody;
              originalError = errorBody;
            }
          }
        } catch {
          // Ignore errors when reading response body
        }

        // Throw error whether body parsing succeeded or failed (avoids duplication)
        throw createBlockfrostError(response.status, errorMessage, endpoint, originalError);
      }

      // Parse successful response
      return await response.json();
    } catch (error) {
      // Re-throw BlockfrostError instances
      if (error instanceof BlockfrostError) {
        throw error;
      }

      // Wrap network/fetch errors
      throw new NetworkError(
        `Network request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        endpoint,
        error,
      );
    }
  }

  /**
   * GET /addresses/{address}
   * Obtain current balance and metadata for a specific address.
   *
   * This endpoint returns the current state of an address by aggregating all unspent UTXOs.
   * The amounts represent what can actually be spent right now (excludes spent UTXOs).
   *
   * Blockfrost indexes the entire blockchain to provide this aggregated view - without such
   * a service, you'd need to crawl the full blockchain and maintain your own UTXO index.
   *
   * Use cases:
   * - Check current balance before creating transactions
   * - Verify address exists on-chain and get associated stake address
   * - See what assets (ADA + native tokens) are currently held
   *
   * @param address - Bech32 payment address (base or enterprise)
   * @returns Address information including:
   *   - `amount`: Current balance per asset (sum of unspent UTXOs)
   *   - `stake_address`: Associated stake address for rewards/delegation (if any)
   *   - `type`: Address era (byron/shelley)
   *   - `script`: Whether this is a script address
   */
  async getAddressInfo(address: PaymentAddress): Promise<AddressInfo> {
    const endpoint = `/addresses/${address}`;
    return this.makeRequest<AddressInfo>(endpoint);
  }

  /**
   * GET /addresses/{address}/transactions
   * Get transactions for a specific address with pagination and ordering.
   *
   * Returns a paginated list of transaction hashes and basic info for transactions
   * that involve the specified address (either as input or output).
   *
   * This endpoint returns transaction references only - for full transaction details,
   * use the individual transaction endpoints with the returned tx_hash values.
   *
   * Use cases:
   * - Get transaction history for an address
   * - Implement transaction pagination in UI
   * - Find recent or historical transactions
   * - Filter transactions by block range
   *
   * @param address - Bech32 payment address (base or enterprise)
   * @param options - Optional pagination and filtering parameters
   * @param options.count - Number of results per page (1-100, default: 100)
   * @param options.page - Page number (default: 1)
   * @param options.order - Sort order: 'asc' (oldest first) or 'desc' (newest first, default: 'asc')
   * @param options.from - Start from specific block number (inclusive)
   * @param options.to - End at specific block number (inclusive)
   * @returns Array of transaction references with basic metadata
   */
  async getAddressTransactions(
    address: PaymentAddress,
    options: {
      count?: number;
      page?: number;
      order?: 'asc' | 'desc';
      from?: string;
      to?: string;
    } = {},
  ): Promise<AddressTransaction[]> {
    const searchParams = new URLSearchParams();

    if (options.count !== undefined) searchParams.set('count', options.count.toString());
    if (options.page !== undefined) searchParams.set('page', options.page.toString());
    if (options.order !== undefined) searchParams.set('order', options.order);
    if (options.from !== undefined) searchParams.set('from', options.from);
    if (options.to !== undefined) searchParams.set('to', options.to);

    const queryString = searchParams.toString();
    const endpoint = `/addresses/${address}/transactions${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<AddressTransaction[]>(endpoint);
  }

  /**
   * GET /addresses/{address}/utxos
   * Get individual UTXOs for a specific address with pagination.
   *
   * Returns a paginated list of individual UTXOs (Unspent Transaction Outputs) currently
   * held at the address. Unlike getAddressInfo() which returns aggregated totals per asset,
   * this endpoint returns each individual UTXO with its specific amounts.
   *
   * Each UTXO represents a discrete output from a transaction that can be spent.
   * UTXOs may contain smart contract data (datum, reference scripts) for DeFi/DApp usage.
   *
   * Use cases:
   * - Building transactions (need individual UTXOs as inputs)
   * - Wallet coin selection algorithms
   * - Smart contract interactions (access datum/script data)
   * - Detailed balance analysis (see which transactions created current balance)
   *
   * @param address - Bech32 payment address (base or enterprise)
   * @param options - Optional pagination parameters
   * @param options.count - Number of results per page (1-100, default: 100)
   * @param options.page - Page number (default: 1)
   * @param options.order - Sort order: 'asc' (oldest first) or 'desc' (newest first, default: 'asc')
   * @returns Array of individual UTXOs with their amounts and smart contract data
   */
  async getAddressUTXOs(
    address: PaymentAddress,
    options: {
      count?: number;
      page?: number;
      order?: 'asc' | 'desc';
    } = {},
  ): Promise<AddressUTXO[]> {
    const searchParams = new URLSearchParams();

    if (options.count !== undefined) searchParams.set('count', options.count.toString());
    if (options.page !== undefined) searchParams.set('page', options.page.toString());
    if (options.order !== undefined) searchParams.set('order', options.order);

    const queryString = searchParams.toString();
    const endpoint = `/addresses/${address}/utxos${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<AddressUTXO[]>(endpoint);
  }

  /**
   * GET /accounts/{stake_address}
   * Obtain information about a specific stake account.
   *
   * This endpoint returns comprehensive information about a Cardano stake account,
   * including delegation status, rewards, withdrawals, and controlled amounts.
   *
   * A stake account (stake address) is used for:
   * - Delegating ADA to stake pools for rewards
   * - Withdrawing accumulated rewards
   * - Voting governance (with DRep delegation)
   *
   * Use cases:
   * - Check delegation status and current pool
   * - Get available rewards ready for withdrawal
   * - Verify account registration state
   * - Monitor staking rewards and treasury/reserves funds
   * - Check DRep delegation for governance voting
   *
   * @param stakeAddress - Bech32 stake address (stake1... or stake_test1...)
   * @returns Account information including:
   *   - `active`: Registration state (true = registered and can earn rewards)
   *   - `controlled_amount`: Total ADA controlled by this account (in lovelaces)
   *   - `rewards_sum`: All-time earned rewards (in lovelaces)
   *   - `withdrawable_amount`: Available rewards ready for withdrawal (in lovelaces)
   *   - `pool_id`: Currently delegated stake pool (null if not delegated)
   *   - `drep_id`: DRep ID for governance voting (null if not delegated)
   */
  async getAccountInfo(stakeAddress: StakeAddress): Promise<AccountInfo> {
    const endpoint = `/accounts/${stakeAddress}`;
    return this.makeRequest<AccountInfo>(endpoint);
  }

  /**
   * GET /accounts/{stake_address}/addresses
   * Get payment addresses associated with a specific stake account.
   *
   * This endpoint returns all payment addresses that are associated with the given stake address.
   * These are addresses that share the same stake key for delegation and reward purposes.
   *
   * **Important**: Be careful when interpreting this data. An account could be part of a mangled
   * address and does not necessarily mean the addresses are owned by the same user as the account.
   * Multiple users could theoretically create addresses using the same stake address.
   *
   * Use cases:
   * - Find all addresses that delegate to the same stake pool
   * - Discover addresses sharing the same staking rewards
   * - Wallet address discovery for stake-based wallets
   * - Analyze address patterns for a given stake key
   *
   * @param stakeAddress - Bech32 stake address (stake1... or stake_test1...)
   * @param options - Optional pagination and ordering parameters
   * @param options.count - Number of results per page (1-100, default: 100)
   * @param options.page - Page number (default: 1)
   * @param options.order - Sort order: 'asc' (oldest first) or 'desc' (newest first, default: 'asc')
   * @returns Array of payment addresses associated with the stake address
   */
  async getAccountAddresses(
    stakeAddress: StakeAddress,
    options: {
      count?: number;
      page?: number;
      order?: 'asc' | 'desc';
    } = {},
  ): Promise<AccountAddress[]> {
    const searchParams = new URLSearchParams();

    if (options.count !== undefined) searchParams.set('count', options.count.toString());
    if (options.page !== undefined) searchParams.set('page', options.page.toString());
    if (options.order !== undefined) searchParams.set('order', options.order);

    const queryString = searchParams.toString();
    const endpoint = `/accounts/${stakeAddress}/addresses${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<AccountAddress[]>(endpoint);
  }

  /**
   * GET /accounts/{stake_address}/addresses/assets
   * Get aggregated assets from all addresses associated with a specific stake account.
   *
   * This endpoint returns the sum of all assets (ADA + native tokens) held across all payment
   * addresses that are associated with the given stake address. Unlike individual address endpoints
   * that show per-address balances, this provides an aggregated view.
   *
   * **Important**: Be careful when interpreting this data. An account could be part of a mangled
   * address and does not necessarily mean all assets belong to the same user as the account.
   * The aggregation includes all addresses using the stake key, regardless of payment key ownership.
   *
   * Use cases:
   * - Get total holdings controlled by a stake address
   * - Portfolio overview for delegation-based wallets
   * - Analyze total assets earning staking rewards
   * - Calculate total value delegated to a pool (with caveats about mangled addresses)
   *
   * @param stakeAddress - Bech32 stake address (stake1... or stake_test1...)
   * @param options - Optional pagination and ordering parameters
   * @param options.count - Number of results per page (1-100, default: 100)
   * @param options.page - Page number (default: 1)
   * @param options.order - Sort order: 'asc' (oldest first) or 'desc' (newest first, default: 'asc')
   * @returns Array of aggregated assets across all addresses associated with the stake address
   */
  async getAccountAddressesAssets(
    stakeAddress: StakeAddress,
    options: {
      count?: number;
      page?: number;
      order?: 'asc' | 'desc';
    } = {},
  ): Promise<AccountAddressAsset[]> {
    const searchParams = new URLSearchParams();

    if (options.count !== undefined) searchParams.set('count', options.count.toString());
    if (options.page !== undefined) searchParams.set('page', options.page.toString());
    if (options.order !== undefined) searchParams.set('order', options.order);

    const queryString = searchParams.toString();
    const endpoint = `/accounts/${stakeAddress}/addresses/assets${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<AccountAddressAsset[]>(endpoint);
  }

  /**
   * GET /accounts/{stake_address}/utxos
   * Get individual UTXOs from all addresses associated with a specific stake account.
   *
   * This endpoint returns all individual UTXOs (Unspent Transaction Outputs) held across all payment
   * addresses that are associated with the given stake address. Unlike the aggregated assets endpoint,
   * this provides individual UTXO details that can be used for transaction building.
   *
   * **Important**: Be careful when interpreting this data. An account could be part of a mangled
   * address and does not necessarily mean all UTXOs belong to the same user as the account.
   * The results include UTXOs from all addresses using the stake key, regardless of payment key ownership.
   *
   * Use cases:
   * - Building transactions (need individual UTXOs as inputs)
   * - Advanced coin selection across multiple addresses with same stake key
   * - Smart contract interactions (access datum/script data from all associated addresses)
   * - Detailed UTXO analysis for delegation-based wallets
   * - Portfolio management for multi-address staking setups
   *
   * @param stakeAddress - Bech32 stake address (stake1... or stake_test1...)
   * @param options - Optional pagination and ordering parameters
   * @param options.count - Number of results per page (1-100, default: 100)
   * @param options.page - Page number (default: 1)
   * @param options.order - Sort order: 'asc' (oldest first) or 'desc' (newest first, default: 'asc')
   * @returns Array of individual UTXOs from all addresses associated with the stake address
   */
  async getAccountUTXOs(
    stakeAddress: StakeAddress,
    options: {
      count?: number;
      page?: number;
      order?: 'asc' | 'desc';
    } = {},
  ): Promise<AddressUTXO[]> {
    const searchParams = new URLSearchParams();

    if (options.count !== undefined) searchParams.set('count', options.count.toString());
    if (options.page !== undefined) searchParams.set('page', options.page.toString());
    if (options.order !== undefined) searchParams.set('order', options.order);

    const queryString = searchParams.toString();
    const endpoint = `/accounts/${stakeAddress}/utxos${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<AddressUTXO[]>(endpoint);
  }

  /**
   * GET /assets/{asset}
   * Get detailed information about a specific native asset.
   *
   * This endpoint returns comprehensive metadata about a Cardano native asset (token),
   * including both on-chain and off-chain information. Native assets are tokens created
   * on Cardano using the native tokens feature, each identified by a unique asset ID.
   *
   * The asset parameter is the concatenation of:
   * - Policy ID (hex-encoded, 56 characters)
   * - Asset name (hex-encoded asset name, variable length)
   *
   * Use cases:
   * - Display token information in wallet UI (name, symbol, logo)
   * - Verify asset authenticity using official metadata
   * - Get current total supply and minting history
   * - Access token metadata for DeFi applications
   * - Implement token discovery and portfolio tracking
   *
   * @param asset - Asset identifier (concatenation of policy_id and hex-encoded asset_name)
   * @returns Asset information including:
   *   - `asset`: Full asset identifier
   *   - `policy_id`: Policy ID that controls the asset
   *   - `fingerprint`: CIP14 user-facing fingerprint
   *   - `quantity`: Current circulating supply
   *   - `metadata`: Off-chain metadata (name, description, ticker, logo, etc.)
   *   - `onchain_metadata`: On-chain metadata following CIP standards
   */
  async getAssetInfo(asset: string): Promise<AssetInfo> {
    const endpoint = `/assets/${asset}`;
    return this.makeRequest<AssetInfo>(endpoint);
  }

  /**
   * GET /txs/{hash}
   * Get detailed information about a specific transaction.
   *
   * This endpoint returns comprehensive information about a Cardano transaction,
   * including block information, amounts, fees, and various transaction counts.
   * It provides a complete overview of what happened in the transaction.
   *
   * The transaction data includes counts for different types of operations:
   * - UTXO operations (inputs/outputs)
   * - Staking operations (delegations, registrations, withdrawals)
   * - Asset operations (minting, burning)
   * - Smart contract operations (redeemers, script execution)
   *
   * Use cases:
   * - Display detailed transaction information in wallet UI
   * - Analyze transaction composition and complexity
   * - Verify transaction execution and smart contract results
   * - Track asset movements and operations
   * - Implement transaction history with rich details
   *
   * @param txHash - Transaction hash (64-character hex string)
   * @returns Transaction information including:
   *   - `hash`: Transaction hash
   *   - `block`: Block hash containing the transaction
   *   - `block_height`: Block number
   *   - `block_time`: Block creation time in UNIX timestamp
   *   - `slot`: Cardano slot number
   *   - `index`: Transaction index within the block
   *   - `output_amount`: Total amounts sent in the transaction per asset
   *   - `fees`: Transaction fees in Lovelaces
   *   - `deposit`: Deposit amount in Lovelaces
   *   - `size`: Transaction size in bytes
   *   - `invalid_before`/`invalid_hereafter`: Validity time bounds
   *   - Various counts: UTXOs, withdrawals, delegations, certificates, etc.
   *   - `valid_contract`: Whether smart contract execution was successful
   */
  async getTransactionInfo(txHash: string): Promise<TransactionInfo> {
    const endpoint = `/txs/${txHash}`;
    return this.makeRequest<TransactionInfo>(endpoint);
  }

  /**
   * GET /txs/{hash}/utxos
   * Get the inputs and UTXOs of a specific transaction.
   *
   * This endpoint returns the complete UTXO structure of a transaction, showing both:
   * - **Inputs**: UTXOs that were consumed (spent) by this transaction
   * - **Outputs**: New UTXOs that were created by this transaction
   *
   * This is different from other UTXO endpoints:
   * - `/addresses/{address}/utxos` shows current unspent UTXOs at an address
   * - `/accounts/{stake_address}/utxos` shows current unspent UTXOs across all addresses for a stake account
   * - This endpoint shows the historical input/output structure of a specific transaction
   *
   * The data includes smart contract information (datum hashes, inline datums, reference scripts)
   * and flags for collateral and reference inputs/outputs used in Plutus script execution.
   *
   * Use cases:
   * - Analyze what a transaction consumed and created
   * - Track the flow of assets through transactions
   * - Debug smart contract executions (collateral, reference inputs)
   * - Implement detailed transaction history views
   * - Build transaction dependency graphs
   * - Verify transaction inputs and outputs for auditing
   *
   * @param txHash - Transaction hash (64-character hex string)
   * @returns Transaction UTXO information including:
   *   - `hash`: Transaction hash
   *   - `inputs`: Array of UTXOs consumed by the transaction (with collateral/reference flags)
   *   - `outputs`: Array of UTXOs created by the transaction (with consumed_by_tx tracking)
   *   - Smart contract data: `data_hash`, `inline_datum`, `reference_script_hash`
   *   - Execution context: `collateral`, `reference` flags for Plutus validation
   */
  async getTransactionUTXOs(txHash: string): Promise<TransactionUTXOs> {
    const endpoint = `/txs/${txHash}/utxos`;
    return this.makeRequest<TransactionUTXOs>(endpoint);
  }

  /**
   * GET /blocks/latest
   * Return the latest block available to the backends (tip of the blockchain).
   *
   * This endpoint returns information about the most recent block that has been
   * added to the blockchain. It's useful for:
   * - Getting the current block height to check if new blocks have been added
   * - Determining if wallet data needs to be synced (compare with lastFetchedBlock)
   * - Monitoring blockchain progression
   *
   * @returns Latest block information including:
   *   - `height`: Block number (current blockchain height)
   *   - `hash`: Block hash
   *   - `time`: Block creation time in UNIX timestamp
   *   - `slot`: Cardano slot number
   *   - `epoch`: Current epoch number
   *   - `tx_count`: Number of transactions in the block
   */
  async getLatestBlock(): Promise<BlockInfo> {
    const endpoint = `/blocks/latest`;
    return this.makeRequest<BlockInfo>(endpoint);
  }
}

// Endpoints currently used in the codebase (for reference):
// /addresses/${address} - Get address info ✅ IMPLEMENTED
// /addresses/${address}/transactions - Get address transactions (with pagination and ordering) ✅ IMPLEMENTED
// /addresses/${address}/utxos - Get address UTXOs (with pagination) ✅ IMPLEMENTED
// /accounts/${stakeAddress} - Get account info ✅ IMPLEMENTED
// /accounts/${stakeAddress}/addresses - Get payment addresses for stake address ✅ IMPLEMENTED
// /accounts/${stakeAddress}/addresses/assets - Get account assets ✅ IMPLEMENTED
// /accounts/${stakeAddress}/utxos - Get account UTXOs ✅ IMPLEMENTED
// /assets/${unit} - Get asset metadata ✅ IMPLEMENTED
// /txs/${txHash} - Get transaction details ✅ IMPLEMENTED
// /txs/${txHash}/utxos - Get transaction UTXOs ✅ IMPLEMENTED
