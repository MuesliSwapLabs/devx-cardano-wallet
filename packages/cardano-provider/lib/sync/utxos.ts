import type { WalletRecord, UTXORecord, TransactionRecord } from '@extension/storage';
import { devxData } from '@extension/storage';

/**
 * Syncs wallet UTXOs by deriving them from transaction data
 * Builds complete UTXO history (spent + unspent) from transaction inputs/outputs
 * @param wallet - Wallet record to sync
 * @param currentBlockHeight - Current blockchain block height for sync tracking
 * @param existingUtxos - Currently stored UTXOs from DB
 * @param transactions - New transactions to process (sorted by block_height)
 * @param paymentAddresses - All payment addresses belonging to this wallet (for external UTXO detection)
 * @param onProgress - Optional callback for progress updates (current, total)
 * @returns Count of changes (new UTXOs + newly spent UTXOs)
 */
export async function syncWalletUtxos(
  wallet: WalletRecord,
  currentBlockHeight: number,
  existingUtxos: UTXORecord[],
  transactions: TransactionRecord[],
  paymentAddresses: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<number> {
  try {
    // Step 1: Create set of payment addresses for fast lookup
    const paymentAddressSet = new Set(paymentAddresses);

    // Step 2: Initialize UTXO map from existing UTXOs
    const utxoMap = new Map<string, UTXORecord>();

    existingUtxos.forEach(utxo => {
      const key = `${utxo.tx_hash}:${utxo.output_index}`;
      utxoMap.set(key, utxo);
    });

    // Step 3: Sort transactions chronologically (oldest first)
    const sortedTransactions = [...transactions].sort((a, b) => a.block_height - b.block_height);

    // Step 3: Process each transaction
    for (let i = 0; i < sortedTransactions.length; i++) {
      const transaction = sortedTransactions[i];

      // Report progress
      onProgress?.(i + 1, sortedTransactions.length);

      // A. Process outputs (create new UTXOs)
      if (transaction.outputs) {
        for (const output of transaction.outputs) {
          const key = `${transaction.hash}:${output.output_index}`;

          // Skip if UTXO already exists (defensive)
          if (utxoMap.has(key)) {
            continue;
          }

          // Create new UTXO record
          const utxoRecord: UTXORecord = {
            address: output.address,
            tx_hash: transaction.hash,
            output_index: output.output_index,
            amount: output.amount,
            block: transaction.block, // Block hash where UTXO was created
            data_hash: output.data_hash,
            inline_datum: output.inline_datum,
            reference_script_hash: output.reference_script_hash,
            walletId: wallet.id,
            isSpent: false, // Initially unspent
            spentInTx: null,
            isExternal: !paymentAddressSet.has(output.address as string), // Check against all wallet payment addresses
            lastSynced: Date.now(),
          };

          utxoMap.set(key, utxoRecord);
        }
      }

      // B. Process inputs (mark UTXOs as spent or create external UTXOs)
      if (transaction.inputs) {
        for (const input of transaction.inputs) {
          const key = `${input.tx_hash}:${input.output_index}`;
          const utxo = utxoMap.get(key);

          if (utxo) {
            // Mark existing UTXO as spent
            utxo.isSpent = true;
            utxo.spentInTx = transaction.hash;
          } else {
            // UTXO not in our map - create it from input data (external UTXO, already spent)
            const externalUtxo: UTXORecord = {
              address: input.address,
              tx_hash: input.tx_hash, // Original tx that created this UTXO
              output_index: input.output_index,
              amount: input.amount,
              block: transaction.block, // Use current tx's block (we don't know the original)
              data_hash: input.data_hash,
              inline_datum: input.inline_datum,
              reference_script_hash: input.reference_script_hash,
              walletId: wallet.id,
              isSpent: true, // Already spent in this transaction
              spentInTx: transaction.hash,
              isExternal: !paymentAddressSet.has(input.address as string),
              lastSynced: Date.now(),
            };

            utxoMap.set(key, externalUtxo);
          }
        }
      }
    }

    // Step 4: Store results
    const utxoArray = Array.from(utxoMap.values());
    await devxData.storeUTXOs(wallet.id, utxoArray);

    // Update wallet with current blockchain height
    await devxData.updateWallet(wallet.id, {
      lastFetchedBlockUtxos: currentBlockHeight,
    });

    // Step 5: Return change count
    const changeCount = Math.abs(utxoArray.length - existingUtxos.length);
    return changeCount;
  } catch (error) {
    console.error('Failed to sync wallet UTXOs:', error);
    throw error;
  }
}
