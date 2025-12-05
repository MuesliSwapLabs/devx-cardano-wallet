import type {
  WalletRecord,
  TransactionRecord,
  EnhancedTransactionInputUTXO,
  EnhancedTransactionOutputUTXO,
} from '@extension/storage';
import type { AccountAddress, AddressTransaction } from '@extension/shared/lib/types/blockfrost';
import type { SyncProgress } from '@extension/shared/lib/types/sync';
import { devxSettings, devxData } from '@extension/storage';
import { BlockfrostClient } from '../client/blockfrost';
import { isExternalAddress } from '../utils/address';

/**
 * Syncs wallet transactions using stake address
 * Fetches transaction details only for new transactions
 * @param wallet - Wallet record to sync
 * @param currentBlockHeight - Current blockchain block height for sync tracking
 * @param apiUrl - Blockfrost API URL
 * @param apiKey - Blockfrost API key
 * @param abortSignal - AbortSignal to cancel the operation
 * @param onProgress - Optional callback for progress updates
 * @returns Count of new transactions that were synced
 */
export async function syncWalletTransactions(
  wallet: WalletRecord,
  currentBlockHeight: number,
  apiUrl: string,
  apiKey: string,
  abortSignal?: AbortSignal,
  onProgress?: (progress: SyncProgress) => void,
): Promise<number> {
  try {
    // Early exit: If we've already synced up to current block, no new transactions possible
    const lastFetchedBlock = wallet.lastFetchedBlockTransactions || 0;
    if (lastFetchedBlock >= currentBlockHeight) {
      return 0;
    }

    // Get existing transactions from DB
    const existingTransactions = await devxData.getWalletTransactions(wallet.id);
    const client = new BlockfrostClient({ apiKey, network: wallet.network });

    // Get ALL payment addresses with pagination
    const allAddresses: AccountAddress[] = [];
    let addressPage = 1;

    while (true) {
      if (abortSignal?.aborted) {
        throw new Error('Sync aborted');
      }

      const pageAddresses = await client.getAccountAddresses(wallet.stakeAddress as any, {
        count: 100,
        page: addressPage,
      });

      if (pageAddresses.length === 0) break;
      allAddresses.push(...pageAddresses);

      if (pageAddresses.length < 100) break; // Stop if less than limit
      addressPage++;
    }

    // Fetch transaction references for each payment address with pagination and block filtering
    const allTxRefs: AddressTransaction[] = [];
    const fromBlock = wallet.lastFetchedBlockTransactions || 0;

    for (let addrIdx = 0; addrIdx < allAddresses.length; addrIdx++) {
      if (abortSignal?.aborted) {
        throw new Error('Sync aborted');
      }

      onProgress?.({
        status: 'progress',
        message: `Scanning addresses for new tx: ${addrIdx + 1}/${allAddresses.length}`,
      });

      const addr = allAddresses[addrIdx];
      let txPage = 1;

      while (true) {
        if (abortSignal?.aborted) {
          throw new Error('Sync aborted');
        }

        const pageTxRefs = await client.getAddressTransactions(addr.address as any, {
          order: 'desc', // Newest first for efficient incremental sync
          count: 100,
          page: txPage,
          from: fromBlock > 0 ? (fromBlock + 1).toString() : undefined,
        });

        if (pageTxRefs.length === 0) break;
        allTxRefs.push(...pageTxRefs);

        // If we got less than 100, we're done with this address
        if (pageTxRefs.length < 100) break;
        txPage++;
      }
    }

    // Remove duplicates (same tx can appear in multiple addresses)
    const uniqueTxRefs = Array.from(new Map(allTxRefs.map(tx => [tx.tx_hash, tx])).values());

    // Create lookup set from existing transactions for fast comparison
    const existingTxHashes = new Set(existingTransactions.map(tx => tx.hash));

    // Find only NEW transactions
    const newTxRefs = uniqueTxRefs.filter(txRef => !existingTxHashes.has(txRef.tx_hash));

    // If no new transactions, just update block height and return
    if (newTxRefs.length === 0) {
      await devxData.updateWallet(wallet.id, {
        lastFetchedBlockTransactions: currentBlockHeight,
      });
      return 0;
    }

    onProgress?.({
      status: 'progress',
      message: `Fetching details for ${newTxRefs.length} new transactions`,
      current: 0,
      total: newTxRefs.length,
    });

    // Fetch full transaction details only for NEW transactions
    const newTransactions: TransactionRecord[] = [];

    for (let i = 0; i < newTxRefs.length; i++) {
      if (abortSignal?.aborted) {
        throw new Error('Sync aborted');
      }

      const txRef = newTxRefs[i];

      // Report progress for metadata fetching
      onProgress?.({
        status: 'progress',
        message: `Fetching transaction ${i + 1}/${newTxRefs.length}`,
        current: i + 1,
        total: newTxRefs.length,
      });

      try {
        // Fetch BOTH transaction info AND input/output UTXOs in parallel
        const [txInfo, txUtxos] = await Promise.all([
          client.getTransactionInfo(txRef.tx_hash),
          client.getTransactionUTXOs(txRef.tx_hash),
        ]);

        // Payment addresses for ownership check
        const paymentAddresses = wallet.paymentAddresses || [];

        // Enhance inputs with isExternal flag
        const enhancedInputs: EnhancedTransactionInputUTXO[] = txUtxos.inputs.map(input => ({
          ...input,
          isExternal: isExternalAddress(input.address as string, paymentAddresses),
        }));

        // Enhance outputs with isExternal flag
        const enhancedOutputs: EnhancedTransactionOutputUTXO[] = txUtxos.outputs.map(output => ({
          ...output,
          isExternal: isExternalAddress(output.address as string, paymentAddresses),
        }));

        // Merge inputs/outputs with collateral/reference flags into transaction record
        newTransactions.push({
          ...txInfo,
          inputs: enhancedInputs,
          outputs: enhancedOutputs,
          walletId: wallet.id,
          lastSynced: Date.now(),
        });
      } catch (error) {
        console.error(`Failed to fetch transaction ${txRef.tx_hash}:`, error);
      }
    }

    onProgress?.({
      status: 'progress',
      message: 'Storing transactions',
    });

    // Store only new transactions
    if (newTransactions.length > 0) {
      await devxData.storeTransactions(wallet.id, newTransactions);
    }

    // Update lastFetchedBlockTransactions with current blockchain height
    await devxData.updateWallet(wallet.id, {
      lastFetchedBlockTransactions: currentBlockHeight,
    });

    onProgress?.({
      status: 'progress',
      message: `Synced ${newTxRefs.length} transactions`,
    });

    return newTxRefs.length;
  } catch (error) {
    console.error('Failed to sync wallet transactions:', error);
    throw error;
  }
}
