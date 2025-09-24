// Blockfrost API response types based on OpenAPI schema

import type { AnyAddress, StakeAddress, PaymentAddress } from './addresses';

// Common amount type used across many endpoints
export interface Amount {
  /** The unit of the value - 'lovelace' or concatenation of policy_id and hex-encoded asset_name */
  unit: string;
  /** The quantity of the unit as a string */
  quantity: string;
}

// Response from GET /addresses/{address}
export interface AddressInfo {
  /** Bech32 encoded address */
  address: AnyAddress;
  /** List of aggregated amounts per asset (sums all unspent UTXOs, not individual UTXOs) */
  amount: Amount[];
  /** Stake address that controls the key (nullable) */
  stake_address: StakeAddress | null;
  /** Address era */
  type: 'byron' | 'shelley';
  /** True if this is a script address */
  script: boolean;
}

// Response from GET /addresses/{address}/transactions
export interface AddressTransaction {
  /** Hash of the transaction */
  tx_hash: string;
  /** Transaction index within the block */
  tx_index: number;
  /** Block height */
  block_height: number;
  /** Block creation time in UNIX time */
  block_time: number;
}

// Response from GET /addresses/{address}/utxos
export interface AddressUTXO {
  /** Bech32 encoded address */
  address: AnyAddress;
  /** Transaction hash of the UTXO */
  tx_hash: string;
  /** UTXO index in the transaction (deprecated) */
  tx_index?: number;
  /** UTXO index in the transaction */
  output_index: number;
  /** List of amounts in the UTXO (individual UTXO amounts, not aggregated) */
  amount: Amount[];
  /** Block hash of the UTXO */
  block: string;
  /** The hash of the transaction output datum */
  data_hash: string | null;
  /** CBOR encoded inline datum */
  inline_datum: string | null;
  /** The hash of the reference script of the output */
  reference_script_hash: string | null;
}

// Response from GET /accounts/{stake_address}
export interface AccountInfo {
  /** Bech32 stake address */
  stake_address: StakeAddress;
  /** Registration state of an account */
  active: boolean;
  /** Epoch of the most recent action - registration or deregistration */
  active_epoch: number | null;
  /** Balance of the account in Lovelaces */
  controlled_amount: string;
  /** Sum of all rewards for the account in the Lovelaces */
  rewards_sum: string;
  /** Sum of all the withdrawals for the account in Lovelaces */
  withdrawals_sum: string;
  /** Sum of all funds from reserves for the account in the Lovelaces */
  reserves_sum: string;
  /** Sum of all funds from treasury for the account in the Lovelaces */
  treasury_sum: string;
  /** Sum of available rewards that haven't been withdrawn yet for the account in the Lovelaces */
  withdrawable_amount: string;
  /** Bech32 pool ID to which this account is delegated */
  pool_id: string | null;
  /** DRep ID to which this account is delegated */
  drep_id: string | null;
}

// Response from GET /accounts/{stake_address}/addresses
export interface AccountAddress {
  /** Bech32 encoded payment address associated with the stake address */
  address: PaymentAddress;
}

// Response from GET /accounts/{stake_address}/addresses/assets
export interface AccountAddressAsset {
  /** The unit of the value - 'lovelace' or concatenation of policy_id and hex-encoded asset_name */
  unit: string;
  /** The quantity of the unit as a string (sum of all assets across all addresses) */
  quantity: string;
}

// Metadata for off-chain asset information
export interface AssetMetadata {
  /** Asset name */
  name?: string;
  /** Asset description */
  description?: string;
  /** Asset ticker symbol */
  ticker?: string | null;
  /** Asset website URL */
  url?: string | null;
  /** Base64 encoded logo of the asset */
  logo?: string | null;
  /** Number of decimal places */
  decimals?: number | null;
}

// Response from GET /assets/{asset}
export interface AssetInfo {
  /** Hex-encoded asset full name (concatenation of policy_id and hex-encoded asset_name) */
  asset: string;
  /** Policy ID of the asset */
  policy_id: string;
  /** Hex-encoded asset name of the asset */
  asset_name: string | null;
  /** CIP14 based user-facing fingerprint */
  fingerprint: string;
  /** Current asset quantity */
  quantity: string;
  /** ID of the initial minting transaction */
  initial_mint_tx_hash: string;
  /** Count of mint and burn transactions */
  mint_or_burn_count: number;
  /** On-chain metadata which SHOULD adhere to valid standards (best effort) */
  onchain_metadata: Record<string, any> | null;
  /** Standard under which on-chain metadata is valid */
  onchain_metadata_standard: 'CIP25v1' | 'CIP25v2' | 'CIP68v1' | 'CIP68v2' | 'CIP68v3' | null;
  /** Arbitrary plutus data (CIP68) */
  onchain_metadata_extra: string | null;
  /** Off-chain metadata fetched from GitHub token registry */
  metadata: AssetMetadata | null;
}

// Response from GET /txs/{hash}
export interface TransactionInfo {
  /** Transaction hash */
  hash: string;
  /** Block hash */
  block: string;
  /** Block number */
  block_height: number;
  /** Block creation time in UNIX time */
  block_time: number;
  /** Slot number */
  slot: number;
  /** Transaction index within the block */
  index: number;
  /** The sum of all the UTXO per asset */
  output_amount: Amount[];
  /** Fees of the transaction in Lovelaces */
  fees: string;
  /** Deposit within the transaction in Lovelaces */
  deposit: string;
  /** Size of the transaction in Bytes */
  size: number;
  /** Left (included) endpoint of the timelock validity intervals */
  invalid_before: string | null;
  /** Right (excluded) endpoint of the timelock validity intervals */
  invalid_hereafter: string | null;
  /** Count of UTXOs within the transaction */
  utxo_count: number;
  /** Count of the withdrawals within the transaction */
  withdrawal_count: number;
  /** Count of the MIR certificates within the transaction */
  mir_cert_count: number;
  /** Count of the delegations within the transaction */
  delegation_count: number;
  /** Count of the stake keys (de)registration within the transaction */
  stake_cert_count: number;
  /** Count of the stake pool registration and update certificates within the transaction */
  pool_update_count: number;
  /** Count of the stake pool retirement certificates within the transaction */
  pool_retire_count: number;
  /** Count of asset mints and burns within the transaction */
  asset_mint_or_burn_count: number;
  /** Count of redeemers within the transaction */
  redeemer_count: number;
  /** True if contract script passed validation */
  valid_contract: boolean;
}

// Input UTXO for GET /txs/{hash}/utxos
export interface TransactionInputUTXO {
  /** Input address */
  address: AnyAddress;
  /** List of amounts in the input UTXO */
  amount: Amount[];
  /** Hash of the UTXO transaction */
  tx_hash: string;
  /** UTXO index in the transaction */
  output_index: number;
  /** The hash of the transaction output datum */
  data_hash: string | null;
  /** CBOR encoded inline datum */
  inline_datum: string | null;
  /** The hash of the reference script of the input */
  reference_script_hash: string | null;
  /** Whether the input is a collateral consumed on script validation failure */
  collateral: boolean;
  /** Whether the input is a reference transaction input */
  reference: boolean;
}

// Output UTXO for GET /txs/{hash}/utxos
export interface TransactionOutputUTXO {
  /** Output address */
  address: AnyAddress;
  /** List of amounts in the output UTXO */
  amount: Amount[];
  /** UTXO index in the transaction */
  output_index: number;
  /** The hash of the transaction output datum */
  data_hash: string | null;
  /** CBOR encoded inline datum */
  inline_datum: string | null;
  /** Whether the output is a collateral output */
  collateral: boolean;
  /** The hash of the reference script of the output */
  reference_script_hash: string | null;
  /** Hash of the transaction that consumed this UTXO (null if unspent) */
  consumed_by_tx: string | null;
}

// Response from GET /txs/{hash}/utxos
export interface TransactionUTXOs {
  /** Transaction hash */
  hash: string;
  /** List of UTXOs consumed as inputs by the transaction */
  inputs: TransactionInputUTXO[];
  /** List of UTXOs created as outputs by the transaction */
  outputs: TransactionOutputUTXO[];
}

// Error response format from Blockfrost
export interface BlockfrostErrorResponse {
  /** HTTP status code */
  status_code: number;
  /** Error name */
  error: string;
  /** Detailed error message */
  message: string;
}
