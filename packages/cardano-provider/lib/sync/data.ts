import type { Wallet, Asset } from '@extension/shared';
import type { WalletRecord, TransactionRecord, UTXORecord } from '@extension/storage';
import type { TransactionInfo, AddressUTXO } from '@extension/shared/lib/types/blockfrost';
import { devxSettings, devxData } from '@extension/storage';
import { BlockfrostClient } from '../client/blockfrost';

/**
 * Unified sync function for wallet data
 * Fetches all data types (assets, transactions, UTXOs) in one go
 * Uses a single lastFetchedBlock tracker for consistency
 */
export async function syncWalletData(wallet: WalletRecord): Promise<void> {
  try {
    // Get API key from settings based on wallet network
    const settings = await devxSettings.get();
    const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

    if (!apiKey) {
      throw new Error(`No API key configured for ${wallet.network} network`);
    }

    // Get the last fetched block (default to 0 if never synced)
    const fromBlock = (wallet.lastFetchedBlock || 0) + 1;

    // Fetch ALL data types in parallel for efficiency
    const [assets, transactions, utxos] = await Promise.all([
      fetchAssetsSinceBlock(wallet.address, fromBlock, apiKey, wallet.network),
      fetchTransactionsSinceBlock(wallet.address, fromBlock, apiKey, wallet.network),
      fetchUTXOsSinceBlock(wallet.address, fromBlock, apiKey, wallet.network),
    ]);

    // Store all data types
    if (assets.length > 0) {
      await devxData.storeAssets(wallet.id, assets);
    }

    if (transactions.length > 0) {
      await devxData.storeTransactions(wallet.id, transactions);
    }

    if (utxos.length > 0) {
      await devxData.storeUTXOs(wallet.id, utxos);
    }

    // Update lastFetchedBlock only once for all data types
    // This ensures consistency - all data is synced to the same block
    const latestBlock = await getCurrentBlockHeight(apiKey, wallet.network);
    await devxData.updateWallet(wallet.id, {
      lastFetchedBlock: latestBlock,
      lastSynced: Date.now(),
    });
  } catch (error) {
    console.error('Failed to sync wallet data:', error);
    throw error;
  }
}

/**
 * Fetches assets for an address since a specific block
 */
export async function fetchAssetsSinceBlock(
  address: string,
  fromBlock: number,
  apiKey: string,
  network: 'Mainnet' | 'Preprod',
): Promise<Asset[]> {
  try {
    const client = new BlockfrostClient({ apiKey, network });

    // Get address info including assets
    const addressInfo = await client.getAddressInfo(address as any);

    // For now, we'll return all assets as Blockfrost doesn't have direct block filtering for assets
    // TODO: Implement proper block-based filtering once we have transaction history
    const assets: Asset[] = [];

    // Process ADA balance as a special asset
    if (addressInfo.amount && addressInfo.amount.length > 0) {
      const adaAmount = addressInfo.amount.find(a => a.unit === 'lovelace');
      if (adaAmount) {
        assets.push({
          unit: 'lovelace',
          quantity: adaAmount.quantity,
          name: 'ADA',
          ticker: 'ADA',
          decimals: 6,
          policyId: '',
          assetName: '',
          fingerprint: '',
        });
      }

      // Process other native tokens
      for (const amount of addressInfo.amount) {
        if (amount.unit !== 'lovelace') {
          // For native tokens, we need to fetch metadata
          // This is a simplified version - in production, you'd fetch full metadata
          assets.push({
            unit: amount.unit,
            quantity: amount.quantity,
            name: amount.unit, // Would be fetched from metadata
            ticker: '', // Would be fetched from metadata
            decimals: 0, // Would be fetched from metadata
            policyId: amount.unit.slice(0, 56), // First 56 chars are policy ID
            assetName: amount.unit.slice(56), // Rest is asset name
            fingerprint: '', // Would be calculated or fetched
          });
        }
      }
    }

    return assets;
  } catch (error) {
    console.error('Failed to fetch assets from blockchain:', error);
    return [];
  }
}

/**
 * Fetches transactions for an address since a specific block
 */
export async function fetchTransactionsSinceBlock(
  address: string,
  fromBlock: number,
  apiKey: string,
  network: 'Mainnet' | 'Preprod',
): Promise<TransactionInfo[]> {
  try {
    const client = new BlockfrostClient({ apiKey, network });

    // Get address transactions
    // Note: Blockfrost doesn't support from_block filter directly on address transactions
    // We'll need to fetch all and filter client-side for now
    const txHashes = await client.getAddressTransactions(address as any);

    // For each transaction hash, get full transaction details
    const transactions: TransactionInfo[] = [];

    for (const txRef of txHashes) {
      try {
        const txDetails = await client.getTransactionInfo(txRef.tx_hash);

        // Filter by block height (if we have block info)
        // For now, include all as we don't have block height in the response yet
        // TODO: Add block filtering once we have block height in transactions

        transactions.push(txDetails);
      } catch (error) {
        console.error(`Failed to fetch transaction ${txRef.tx_hash}:`, error);
      }
    }

    return transactions;
  } catch (error) {
    console.error('Failed to fetch transactions from blockchain:', error);
    return [];
  }
}

/**
 * Fetches UTXOs for an address since a specific block
 */
export async function fetchUTXOsSinceBlock(
  address: string,
  fromBlock: number,
  apiKey: string,
  network: 'Mainnet' | 'Preprod',
): Promise<AddressUTXO[]> {
  try {
    const client = new BlockfrostClient({ apiKey, network });

    // Get address UTXOs
    // Note: This returns current UTXOs, not historical ones
    // For proper syncing, we'd need to track UTXO changes through transactions
    const utxos = await client.getAddressUTXOs(address as any);

    // Return all current UTXOs
    // In a full implementation, we'd:
    // 1. Track which UTXOs were spent in transactions
    // 2. Mark them as spent in our database
    // 3. Add new UTXOs from transaction outputs
    return utxos;
  } catch (error) {
    console.error('Failed to fetch UTXOs from blockchain:', error);
    return [];
  }
}

/**
 * Gets the current block height from the blockchain
 */
async function getCurrentBlockHeight(apiKey: string, network: 'Mainnet' | 'Preprod'): Promise<number> {
  try {
    const client = new BlockfrostClient({ apiKey, network });
    // This would typically use a getLatestBlock endpoint
    // For now, return a placeholder
    // TODO: Implement once BlockfrostClient has getLatestBlock method
    return Date.now(); // Temporary: use timestamp as a unique increasing number
  } catch (error) {
    console.error('Failed to get current block height:', error);
    return Date.now();
  }
}
