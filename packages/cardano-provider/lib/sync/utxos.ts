import type { WalletRecord, UTXORecord } from '@extension/storage';
import type { AddressUTXO } from '@extension/shared/lib/types/blockfrost';
import { devxSettings, devxData } from '@extension/storage';
import { BlockfrostClient } from '../client/blockfrost';

/**
 * Syncs wallet UTXOs using stake address
 * Gets all unspent UTXOs across all payment addresses
 * Only syncs if new blocks have been mined
 * @param wallet - Wallet record to sync
 * @param currentBlockHeight - Current blockchain block height for sync tracking
 * @param existingUtxos - Currently stored UTXOs from DB
 * @param onProgress - Optional callback for progress updates (current, total)
 * @returns Count of new/changed UTXOs that were synced
 */
export async function syncWalletUtxos(
  wallet: WalletRecord,
  currentBlockHeight: number,
  existingUtxos: UTXORecord[],
  onProgress?: (current: number, total: number) => void,
): Promise<number> {
  try {
    const settings = await devxSettings.get();
    const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

    if (!apiKey) {
      throw new Error(`No API key configured for ${wallet.network} network`);
    }

    const client = new BlockfrostClient({ apiKey, network: wallet.network });

    // Fetch ALL unspent UTXOs with pagination
    const allUtxos: AddressUTXO[] = [];
    let page = 1;

    while (true) {
      const pageUtxos = await client.getAccountUTXOs(wallet.stakeAddress as any, {
        count: 100,
        page,
      });

      if (pageUtxos.length === 0) break;
      allUtxos.push(...pageUtxos);
      if (pageUtxos.length < 100) break; // Stop if less than limit
      page++;
    }

    // Create lookup from existing UTXOs for comparison
    const existingUtxoKeys = new Set(existingUtxos.map(utxo => `${utxo.tx_hash}:${utxo.output_index}`));

    // Find new UTXOs
    const newUtxos = allUtxos.filter(utxo => !existingUtxoKeys.has(`${utxo.tx_hash}:${utxo.output_index}`));

    // If no changes, just update block height and return
    if (newUtxos.length === 0 && allUtxos.length === existingUtxos.length) {
      await devxData.updateWallet(wallet.id, {
        lastFetchedBlockUtxos: currentBlockHeight,
      });
      return 0;
    }

    // Convert all current UTXOs to UTXORecord format
    const utxoRecords: UTXORecord[] = allUtxos.map(utxo => ({
      ...utxo,
      walletId: wallet.id,
      lastSynced: Date.now(),
      isSpent: false, // These are unspent by definition
      spentInTx: null,
    }));

    // Store all current UTXOs (replaces old set)
    await devxData.storeUTXOs(wallet.id, utxoRecords);

    // Update wallet with current blockchain height
    await devxData.updateWallet(wallet.id, {
      lastFetchedBlockUtxos: currentBlockHeight,
      lastSynced: Date.now(),
    });

    // Return count of changes (new UTXOs + any that were removed/spent)
    const changeCount = Math.abs(allUtxos.length - existingUtxos.length) + newUtxos.length;
    return changeCount;
  } catch (error) {
    console.error('Failed to sync wallet UTXOs:', error);
    throw error;
  }
}
