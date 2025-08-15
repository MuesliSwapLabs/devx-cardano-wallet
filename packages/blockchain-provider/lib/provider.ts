import { Asset, Wallet } from '@extension/shared';
import { settingsStorage } from '@extension/storage';

// --- Type Definitions ---
// The final, rich asset information we want to return
export interface EnrichedAsset extends Asset {
  policyId: string;
  name: string;
}

// Transaction-related types
export interface TransactionInput {
  address: string;
  amount: BlockfrostAmount[];
  tx_hash: string;
  output_index: number;
}

export interface TransactionOutput {
  address: string;
  amount: BlockfrostAmount[];
  output_index: number;
  data_hash?: string | null;
  inline_datum?: string | null;
  reference_script_hash?: string | null;
}

export interface Transaction {
  hash: string;
  block: string;
  block_height: number;
  block_time: number;
  slot: number;
  index: number;
  output_amount: BlockfrostAmount[];
  fees: string;
  deposit: string;
  size: number;
  invalid_before: string | null;
  invalid_hereafter: string | null;
  utxo_count: number;
  withdrawal_count: number;
  mir_cert_count: number;
  delegation_count: number;
  stake_cert_count: number;
  pool_update_count: number;
  pool_retire_count: number;
  asset_mint_or_burn_count: number;
  redeemer_count: number;
  valid_contract: boolean;
}

export interface TransactionDetails extends Transaction {
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
}

// UTXO-related types for enhanced developer wallet
export interface UTXO {
  address: string;
  tx_hash: string;
  output_index: number;
  amount: BlockfrostAmount[];
  block: string;
  data_hash?: string | null;
  inline_datum?: string | null;
  reference_script_hash?: string | null;
  isSpent: boolean;
  spentInTx?: string | null;
}

// Enhanced transaction with UTXO relationships
export interface EnhancedTransaction extends Transaction {
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  relatedUtxos: UTXO[];
}

// The final state of the entire wallet
export interface WalletState {
  status: 'found' | 'not_found' | 'invalid_address';
  address: string;
  stakeAddress: string | null;
  balance: string; // Lovelace
  assets: EnrichedAsset[];
}

// Blockfrost API response types
type BlockfrostAmount = {
  unit: string;
  quantity: string;
};

type AddressInfoResponse = {
  address: string;
  amount: BlockfrostAmount[];
  stake_address: string | null;
  type: 'shelley';
  script: boolean;
};

type AccountInfoResponse = {
  stake_address: string;
  controlled_amount: string; // This is the total lovelace balance
};

type BlockfrostUTXO = {
  address: string;
  tx_hash: string;
  output_index: number;
  amount: BlockfrostAmount[];
  block: string;
  data_hash?: string | null;
  inline_datum?: string | null;
  reference_script_hash?: string | null;
};

type AddressTransactionResponse = {
  tx_hash: string;
  tx_index: number;
  block_height: number;
  block_time: number;
};

const BLOCKFROST_API_URLS = {
  Mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0',
  Preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
};

// --- Helper Functions ---

/**
 * Gets the API URL and API key for a specific wallet's network.
 */
async function getApiConfigForWallet(wallet: Wallet): Promise<{ apiUrl: string; apiKey: string }> {
  const settings = await settingsStorage.get();
  const apiUrl = BLOCKFROST_API_URLS[wallet.network];

  if (!apiUrl) {
    throw new Error(`Unsupported network: ${wallet.network}`);
  }

  // Get the API key for the wallet's network
  const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

  if (!apiKey) {
    throw new Error(`No API key configured for ${wallet.network} network`);
  }

  return { apiUrl, apiKey };
}

/**
 * A simple client-side check for address format.
 */
function isValidAddressFormat(address: string): boolean {
  return address.startsWith('addr1') || address.startsWith('addr_test1');
}

/**
 * Fetches the stake address associated with a given payment address.
 * Handles the case where the address is valid but has no on-chain history (404).
 */
async function getStakeAddress(
  apiUrl: string,
  apiKey: string,
  paymentAddress: string,
): Promise<{ stakeAddress: string | null; status: 'found' | 'not_found' }> {
  const endpoint = `${apiUrl}/addresses/${paymentAddress}`;
  const response = await fetch(endpoint, {
    headers: { project_id: apiKey },
  });

  if (response.status === 404) {
    return { stakeAddress: null, status: 'not_found' };
  }
  if (!response.ok) {
    throw new Error(`Blockfrost API request failed: ${response.statusText}`);
  }

  const data: AddressInfoResponse = await response.json();
  return { stakeAddress: data.stake_address, status: 'found' };
}

/**
 * Fetches the total ADA balance for an entire account via its stake address.
 */
async function getAccountBalance(apiUrl: string, apiKey: string, stakeAddress: string): Promise<string> {
  const endpoint = `${apiUrl}/accounts/${stakeAddress}`;
  const response = await fetch(endpoint, {
    headers: { project_id: apiKey },
  });
  if (!response.ok) throw new Error(`Failed to fetch account balance: ${response.statusText}`);
  const data: AccountInfoResponse = await response.json();
  return data.controlled_amount;
}

/**
 * Fetches all unique native assets for an entire account via its stake address.
 */
async function getAccountAssets(apiUrl: string, apiKey: string, stakeAddress: string): Promise<Asset[]> {
  const endpoint = `${apiUrl}/accounts/${stakeAddress}/addresses/assets`;
  const response = await fetch(endpoint, {
    headers: { project_id: apiKey },
  });
  if (!response.ok) throw new Error(`Failed to fetch account assets: ${response.statusText}`);
  const data: Asset[] = await response.json();
  // Blockfrost returns ADA as an asset here, so we filter it out.
  return data.filter(asset => asset.unit !== 'lovelace');
}

/**
 * Converts a hex string to a UTF-8 readable string.
 */
function hexToString(hex: string): string {
  // NOTE: Not sure if that's a good idea...
  if (!hex || hex.length % 2 !== 0) {
    return hex; // Return original hex if it's invalid or empty
  }
  try {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return hex; // Fallback to returning the hex on error
  }
}

/**
 * Fetches all payment addresses associated with a stake address.
 */
async function getPaymentAddresses(apiUrl: string, apiKey: string, stakeAddress: string): Promise<string[]> {
  const endpoint = `${apiUrl}/accounts/${stakeAddress}/addresses`;

  console.log('Fetching payment addresses:', {
    endpoint,
    stakeAddress,
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'none',
  });

  const response = await fetch(endpoint, {
    headers: { project_id: apiKey },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Blockfrost API Error:', {
      status: response.status,
      statusText: response.statusText,
      errorBody: errorText,
      endpoint,
      apiKey: apiKey ? `${apiKey.slice(0, 8)}...` : 'MISSING',
      stakeAddress,
    });

    if (response.status === 400) {
      throw new Error(`Invalid stake address: ${stakeAddress}. Check if the wallet stake address is correct.`);
    } else if (response.status === 403) {
      throw new Error(`Blockfrost API key invalid or missing. Please configure your API key in Settings.`);
    } else if (response.status === 404) {
      throw new Error(`Stake address not found: ${stakeAddress}. This might be a new wallet with no transactions.`);
    } else {
      throw new Error(`Failed to fetch payment addresses: ${response.status} ${response.statusText} - ${errorText}`);
    }
  }

  const data: { address: string }[] = await response.json();
  return data.map(item => item.address);
}

/**
 * Fetches transaction hashes for a specific address.
 */
async function getAddressTransactions(apiUrl: string, apiKey: string, address: string): Promise<string[]> {
  const allTxHashes: string[] = [];
  let page = 1;
  const count = 100;

  while (true) {
    const endpoint = `${apiUrl}/addresses/${address}/transactions?page=${page}&count=${count}&order=desc`;
    const response = await fetch(endpoint, {
      headers: { project_id: apiKey },
    });

    if (!response.ok) {
      if (response.status === 404) break; // No more transactions
      throw new Error(`Failed to fetch transactions for address ${address}: ${response.statusText}`);
    }

    const data: { tx_hash: string }[] = await response.json();

    if (data.length === 0) break;

    allTxHashes.push(...data.map(tx => tx.tx_hash));

    if (data.length < count) break; // Last page
    page++;
  }

  return allTxHashes;
}

/**
 * Fetches current UTXOs for a specific address.
 */
async function getAddressUTXOs(apiUrl: string, apiKey: string, address: string): Promise<BlockfrostUTXO[]> {
  const allUtxos: BlockfrostUTXO[] = [];
  let page = 1;
  const count = 100;

  while (true) {
    const endpoint = `${apiUrl}/addresses/${address}/utxos?page=${page}&count=${count}`;
    const response = await fetch(endpoint, {
      headers: { project_id: apiKey },
    });

    if (!response.ok) {
      if (response.status === 404) break; // No UTXOs found
      throw new Error(`Failed to fetch UTXOs for address ${address}: ${response.statusText}`);
    }

    const data: BlockfrostUTXO[] = await response.json();

    if (data.length === 0) break;

    allUtxos.push(...data);

    if (data.length < count) break; // Last page
    page++;
  }

  return allUtxos;
}

/**
 * Fetches all UTXOs for an account via stake address.
 */
async function getAccountUTXOs(apiUrl: string, apiKey: string, stakeAddress: string): Promise<BlockfrostUTXO[]> {
  const endpoint = `${apiUrl}/accounts/${stakeAddress}/utxos`;
  const response = await fetch(endpoint, {
    headers: { project_id: apiKey },
  });

  if (!response.ok) {
    if (response.status === 404) return []; // No UTXOs found
    throw new Error(`Failed to fetch account UTXOs: ${response.statusText}`);
  }

  const data: BlockfrostUTXO[] = await response.json();
  return data;
}

/**
 * Fetches detailed transaction information.
 */
async function getTransactionDetails(apiUrl: string, apiKey: string, txHash: string): Promise<TransactionDetails> {
  // Fetch basic transaction info
  const txResponse = await fetch(`${apiUrl}/txs/${txHash}`, {
    headers: { project_id: apiKey },
  });
  if (!txResponse.ok) throw new Error(`Failed to fetch transaction ${txHash}: ${txResponse.statusText}`);
  const txData: Transaction = await txResponse.json();

  // Fetch transaction inputs and outputs
  const utxosResponse = await fetch(`${apiUrl}/txs/${txHash}/utxos`, {
    headers: { project_id: apiKey },
  });

  if (!utxosResponse.ok) {
    throw new Error(`Failed to fetch UTXOs for transaction ${txHash}`);
  }

  const utxoData = await utxosResponse.json();

  return {
    ...txData,
    inputs: utxoData.inputs || [],
    outputs: utxoData.outputs || [],
  };
}

/**
 * Determines UTXO spent status by checking if they appear as inputs in subsequent transactions.
 */
async function determineUTXOSpentStatus(
  apiUrl: string,
  apiKey: string,
  utxos: BlockfrostUTXO[],
  transactions: AddressTransactionResponse[],
): Promise<UTXO[]> {
  const enhancedUtxos: UTXO[] = utxos.map(utxo => ({
    ...utxo,
    isSpent: false,
    spentInTx: null,
  }));

  // For each transaction, check if any of our UTXOs are consumed as inputs
  for (const tx of transactions) {
    try {
      const txUtxos = await fetch(`${apiUrl}/txs/${tx.tx_hash}/utxos`, {
        headers: { project_id: apiKey },
      });

      if (!txUtxos.ok) continue;

      const txData = await txUtxos.json();
      const inputs = txData.inputs || [];

      // Mark UTXOs as spent if they appear as inputs
      for (const input of inputs) {
        const utxoIndex = enhancedUtxos.findIndex(
          utxo => utxo.tx_hash === input.tx_hash && utxo.output_index === input.output_index,
        );

        if (utxoIndex !== -1) {
          enhancedUtxos[utxoIndex].isSpent = true;
          enhancedUtxos[utxoIndex].spentInTx = tx.tx_hash;
        }
      }
    } catch (error) {
      console.warn(`Failed to process transaction ${tx.tx_hash} for UTXO analysis:`, error);
    }
  }

  return enhancedUtxos;
}

// --- Main Exported Function ---

/**
 * Fetches the complete state of a wallet (total balance and all assets)
 * by looking up the stake key associated with a given payment address.
 * @param wallet The wallet object containing the address and network information.
 * @returns A promise that resolves to a WalletState object.
 */
export const getWalletState = async (wallet: Wallet): Promise<WalletState> => {
  const address = wallet.address;

  // For spoofed wallets, we might need to determine the stake address from the input
  let stakeAddress: string | null = wallet.stakeAddress;
  let status: 'found' | 'not_found' = 'found';

  if (!stakeAddress) {
    // Fallback: try to get stake address from the wallet address (for legacy compatibility)
    if (!isValidAddressFormat(address)) {
      return {
        status: 'invalid_address',
        address,
        stakeAddress: null,
        balance: '0',
        assets: [],
      };
    }

    const { apiUrl, apiKey } = await getApiConfigForWallet(wallet);
    const result = await getStakeAddress(apiUrl, apiKey, address);
    stakeAddress = result.stakeAddress;
    status = result.status;

    if (status === 'not_found') {
      return {
        status: 'not_found',
        address,
        stakeAddress: null,
        balance: '0',
        assets: [],
      };
    }
  }

  if (!stakeAddress) {
    // This can happen if the address is valid but has no associated stake key (e.g., some scripts)
    // For our purpose, we treat it as having no account-wide data to fetch.
    return {
      status: 'found',
      address,
      stakeAddress: null,
      balance: '0',
      assets: [],
    };
  }

  try {
    const { apiUrl, apiKey } = await getApiConfigForWallet(wallet);

    // Fetch balance and assets in parallel for efficiency
    const [balance, rawAssets] = await Promise.all([
      getAccountBalance(apiUrl, apiKey, stakeAddress),
      getAccountAssets(apiUrl, apiKey, stakeAddress),
    ]);

    // Enrich asset data with readable names and policy IDs
    const enrichedAssets: EnrichedAsset[] = rawAssets.map(asset => {
      const policyId = asset.unit.slice(0, 56);
      const hexName = asset.unit.slice(56);
      console.log(`Enriching asset: ${asset.unit} with policyId: ${policyId} and hexName: ${hexName}`);
      return {
        ...asset,
        policyId,
        name: hexToString(hexName),
      };
    });

    return {
      status: 'found',
      address,
      stakeAddress,
      balance,
      assets: enrichedAssets,
    };
  } catch (error) {
    console.error('Failed to fetch full wallet state:', error);
    // Return a default error state
    return {
      status: 'not_found',
      address,
      stakeAddress,
      balance: '0',
      assets: [],
    };
  }
};

/**
 * Fetches all transactions for a wallet by getting all payment addresses
 * associated with the wallet's stake address and then fetching transactions
 * for each address.
 * @param wallet The wallet object containing the address and network information.
 * @returns A promise that resolves to an array of transaction details.
 */
export const getTransactions = async (wallet: Wallet): Promise<TransactionDetails[]> => {
  const { apiUrl, apiKey } = await getApiConfigForWallet(wallet);

  // Use the wallet's stake address directly - it's always available now
  const stakeAddress = wallet.stakeAddress;

  if (!stakeAddress) {
    console.log('No stake address found for wallet, returning empty transactions');
    return [];
  }

  console.log('Fetching transactions for wallet:', {
    walletId: wallet.id,
    stakeAddress,
    hasApiKey: !!apiKey,
    network: wallet.network,
  });

  try {
    // Get all payment addresses for this stake address
    const paymentAddresses = await getPaymentAddresses(apiUrl, apiKey, stakeAddress);

    // Get all transaction hashes from all addresses
    const allTxHashesPromises = paymentAddresses.map(address => getAddressTransactions(apiUrl, apiKey, address));

    const allTxHashesArrays = await Promise.all(allTxHashesPromises);
    const allTxHashes = [...new Set(allTxHashesArrays.flat())]; // Remove duplicates

    // Fetch detailed information for each transaction (limit to first 50 for performance)
    const limitedTxHashes = allTxHashes.slice(0, 50);
    const transactionDetailsPromises = limitedTxHashes.map(txHash =>
      getTransactionDetails(apiUrl, apiKey, txHash).catch(error => {
        console.warn(`Failed to fetch details for transaction ${txHash}:`, error);
        return null;
      }),
    );

    const transactionDetails = await Promise.all(transactionDetailsPromises);

    // Filter out failed requests and sort by block time (newest first)
    return transactionDetails
      .filter((tx): tx is TransactionDetails => tx !== null)
      .sort((a, b) => b.block_time - a.block_time);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return [];
  }
};

/**
 * Fetches all UTXOs for a wallet with spent/unspent status determination.
 * This is the core function for the developer wallet's UTXO management.
 */
export const getWalletUTXOs = async (wallet: Wallet): Promise<UTXO[]> => {
  const { apiUrl, apiKey } = await getApiConfigForWallet(wallet);
  const stakeAddress = wallet.stakeAddress;

  if (!stakeAddress) {
    console.log('No stake address found for wallet, returning empty UTXOs');
    return [];
  }

  console.log('Fetching UTXOs for wallet:', {
    walletId: wallet.id,
    stakeAddress,
    hasApiKey: !!apiKey,
    network: wallet.network,
  });

  try {
    // Get current unspent UTXOs for the account
    const currentUtxos = await getAccountUTXOs(apiUrl, apiKey, stakeAddress);

    // Get all payment addresses to fetch transaction history
    const paymentAddresses = await getPaymentAddresses(apiUrl, apiKey, stakeAddress);

    // Get comprehensive transaction history for UTXO analysis
    const allTransactionsPromises = paymentAddresses.map(async address => {
      const endpoint = `${apiUrl}/addresses/${address}/transactions?order=desc&count=100`;
      const response = await fetch(endpoint, {
        headers: { project_id: apiKey },
      });

      if (!response.ok) return [];

      const data: AddressTransactionResponse[] = await response.json();
      return data;
    });

    const allTransactionsArrays = await Promise.all(allTransactionsPromises);
    const allTransactions = allTransactionsArrays.flat();

    // Build comprehensive UTXO set by analyzing transaction outputs
    const allUtxosMap = new Map<string, UTXO>();

    // First, collect all UTXOs created by transaction outputs
    for (const tx of allTransactions) {
      try {
        const txDetails = await getTransactionDetails(apiUrl, apiKey, tx.tx_hash);

        console.log(`\n=== Transaction: ${tx.tx_hash.slice(0, 5)}... ===`);
        console.log('  Inputs:');
        txDetails.inputs.forEach((input, idx) => {
          const belongsToWallet = paymentAddresses.includes(input.address);
          const assetList = input.amount
            .map(a => `${a.quantity} ${a.unit === 'lovelace' ? 'ADA' : a.unit.slice(0, 8)}`)
            .join(', ');
          console.log(
            `    - Input ${idx}: ${input.tx_hash.slice(0, 8)}:${input.output_index} (${assetList}) [${belongsToWallet ? 'WALLET' : 'EXTERNAL'}]`,
          );
        });

        console.log('  Outputs:');
        txDetails.outputs.forEach((output, idx) => {
          const belongsToWallet = paymentAddresses.includes(output.address);
          const assetList = output.amount
            .map(a => `${a.quantity} ${a.unit === 'lovelace' ? 'ADA' : a.unit.slice(0, 8)}`)
            .join(', ');
          console.log(
            `    - Output ${idx}: ${output.address.slice(0, 12)}... (${assetList}) [${belongsToWallet ? 'WALLET' : 'EXTERNAL'}]`,
          );
        });

        // Process outputs to create UTXOs
        txDetails.outputs.forEach((output, index) => {
          // Only include outputs that belong to this wallet's addresses
          if (paymentAddresses.includes(output.address)) {
            const utxoKey = `${tx.tx_hash}:${index}`;
            allUtxosMap.set(utxoKey, {
              address: output.address,
              tx_hash: tx.tx_hash,
              output_index: index,
              amount: output.amount,
              block: txDetails.block,
              data_hash: output.data_hash,
              inline_datum: output.inline_datum,
              reference_script_hash: output.reference_script_hash,
              isSpent: false, // Initially mark as unspent
              spentInTx: null,
            });
            console.log(`    --> Stored UTXO: ${utxoKey}`);
          }
        });
      } catch (error) {
        console.warn(`Failed to fetch details for transaction ${tx.tx_hash}:`, error);
      }
    }

    // Now determine which UTXOs are spent by checking transaction inputs
    console.log('\n=== UTXO SPENDING ANALYSIS ===');
    for (const tx of allTransactions) {
      try {
        const txDetails = await getTransactionDetails(apiUrl, apiKey, tx.tx_hash);

        console.log(`\nAnalyzing inputs for transaction: ${tx.tx_hash.slice(0, 5)}...`);

        // Process inputs to mark UTXOs as spent
        txDetails.inputs.forEach((input, idx) => {
          const utxoKey = `${input.tx_hash}:${input.output_index}`;
          const utxo = allUtxosMap.get(utxoKey);
          const belongsToWallet = paymentAddresses.includes(input.address);

          console.log(
            `  - Input ${idx}: Looking for UTXO ${input.tx_hash.slice(0, 8)}:${input.output_index} [${belongsToWallet ? 'WALLET' : 'EXTERNAL'}]`,
          );

          if (utxo && belongsToWallet) {
            utxo.isSpent = true;
            utxo.spentInTx = tx.tx_hash;
            console.log(`    --> FOUND and marked as spent in ${tx.tx_hash.slice(0, 8)}...`);
          } else if (belongsToWallet && !utxo) {
            console.log(`    --> MISSING: This UTXO belongs to wallet but not found in our database!`);
          } else if (!belongsToWallet) {
            console.log(`    --> SKIPPED: External UTXO (not our wallet)`);
          }
        });
      } catch (error) {
        console.warn(`Failed to analyze inputs for transaction ${tx.tx_hash}:`, error);
      }
    }

    // Convert map to array and sort
    const allUtxos = Array.from(allUtxosMap.values());

    console.log('\n=== FINAL UTXO SUMMARY ===');
    console.log(`Total UTXOs stored: ${allUtxos.length}`);
    console.log(`Unspent UTXOs: ${allUtxos.filter(u => !u.isSpent).length}`);
    console.log(`Spent UTXOs: ${allUtxos.filter(u => u.isSpent).length}`);
    console.log(`Current unspent from Blockfrost API: ${currentUtxos.length}`);

    console.log('\nDetailed UTXO list:');
    allUtxos.forEach((utxo, idx) => {
      const assetList = utxo.amount
        .map(a => `${a.quantity} ${a.unit === 'lovelace' ? 'ADA' : a.unit.slice(0, 8)}`)
        .join(', ');
      console.log(
        `  ${idx + 1}. ${utxo.tx_hash.slice(0, 8)}:${utxo.output_index} (${assetList}) [${utxo.isSpent ? `SPENT in ${utxo.spentInTx?.slice(0, 8)}` : 'UNSPENT'}]`,
      );
    });

    return allUtxos.sort((a, b) => b.tx_hash.localeCompare(a.tx_hash));
  } catch (error) {
    console.error('Failed to fetch wallet UTXOs:', error);
    return [];
  }
};

/**
 * Fetches enhanced transaction data with related UTXO information.
 */
export const getEnhancedTransactions = async (wallet: Wallet): Promise<EnhancedTransaction[]> => {
  try {
    const [transactions, utxos] = await Promise.all([getTransactions(wallet), getWalletUTXOs(wallet)]);

    // Enhance transactions with related UTXO data
    const enhancedTransactions: EnhancedTransaction[] = transactions.map(tx => {
      const relatedUtxos = utxos.filter(utxo => utxo.tx_hash === tx.hash || utxo.spentInTx === tx.hash);

      return {
        ...tx,
        relatedUtxos,
      };
    });

    return enhancedTransactions;
  } catch (error) {
    console.error('Failed to fetch enhanced transactions:', error);
    return [];
  }
};
