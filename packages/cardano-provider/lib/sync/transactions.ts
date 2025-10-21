import type { WalletRecord, TransactionRecord } from '@extension/storage';
import type { AccountAddress, AddressTransaction, TransactionInfo } from '@extension/shared/lib/types/blockfrost';
import { devxSettings, devxData } from '@extension/storage';
import { BlockfrostClient } from '../client/blockfrost';

/**
 * Syncs wallet transactions using stake address
 * First gets all payment addresses, then fetches transactions for each
 * Uses lastFetchedBlockTransactions for incremental sync
 */
export async function syncWalletTransactions(wallet: WalletRecord): Promise<void> {
  try {
    const settings = await devxSettings.get();
    const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

    if (!apiKey) {
      throw new Error(`No API key configured for ${wallet.network} network`);
    }

    const client = new BlockfrostClient({ apiKey, network: wallet.network });

    // Get all payment addresses for this stake address
    const addresses: AccountAddress[] = await client.getAccountAddresses(wallet.stakeAddress as any);

    // Fetch transactions for each payment address
    const allTxRefs: AddressTransaction[] = [];
    for (const addr of addresses) {
      const txRefs = await client.getAddressTransactions(addr.address as any, {
        order: 'desc', // Newest first for efficient incremental sync
      });
      allTxRefs.push(...txRefs);
    }

    // Remove duplicates (same tx can appear in multiple addresses)
    const uniqueTxRefs = Array.from(new Map(allTxRefs.map(tx => [tx.tx_hash, tx])).values());

    // Filter by block height if we have lastFetchedBlockTransactions
    const fromBlock = wallet.lastFetchedBlockTransactions || 0;
    const filteredTxRefs = uniqueTxRefs.filter(tx => tx.block_height > fromBlock);

    // Fetch full transaction details for filtered transactions
    const transactions: TransactionRecord[] = [];
    let maxBlockHeight = fromBlock;

    for (const txRef of filteredTxRefs) {
      try {
        const txInfo: TransactionInfo = await client.getTransactionInfo(txRef.tx_hash);

        transactions.push({
          ...txInfo,
          walletId: wallet.id,
          lastSynced: Date.now(),
        });

        // Track highest block height
        if (txInfo.block_height > maxBlockHeight) {
          maxBlockHeight = txInfo.block_height;
        }
      } catch (error) {
        console.error(`Failed to fetch transaction ${txRef.tx_hash}:`, error);
      }
    }

    // Store transactions
    if (transactions.length > 0) {
      await devxData.storeTransactions(wallet.id, transactions);
    }

    // Update lastFetchedBlockTransactions with highest block seen
    await devxData.updateWallet(wallet.id, {
      lastFetchedBlockTransactions: maxBlockHeight,
      lastSynced: Date.now(),
    });
  } catch (error) {
    console.error('Failed to sync wallet transactions:', error);
    throw error;
  }
}
