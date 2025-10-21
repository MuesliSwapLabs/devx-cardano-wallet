import type { WalletRecord, UTXORecord } from '@extension/storage';
import type { AddressUTXO } from '@extension/shared/lib/types/blockfrost';
import { devxSettings, devxData } from '@extension/storage';
import { BlockfrostClient } from '../client/blockfrost';

/**
 * Syncs wallet UTXOs using stake address
 * Gets all unspent UTXOs across all payment addresses
 * Note: This endpoint only returns UNSPENT UTXOs (current state)
 */
export async function syncWalletUtxos(wallet: WalletRecord): Promise<void> {
  try {
    const settings = await devxSettings.get();
    const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

    if (!apiKey) {
      throw new Error(`No API key configured for ${wallet.network} network`);
    }

    const client = new BlockfrostClient({ apiKey, network: wallet.network });

    // Fetch all unspent UTXOs via stake address
    // This aggregates UTXOs from all payment addresses automatically
    const utxos: AddressUTXO[] = await client.getAccountUTXOs(wallet.stakeAddress as any);

    // Convert to UTXORecord format
    const utxoRecords: UTXORecord[] = utxos.map(utxo => ({
      ...utxo,
      walletId: wallet.id,
      lastSynced: Date.now(),
      isSpent: false, // These are unspent by definition
      spentInTx: null,
    }));

    // Track highest block height from UTXOs
    let maxBlockHeight = wallet.lastFetchedBlockUtxos || 0;
    for (const utxo of utxos) {
      if (utxo.block && parseInt(utxo.block) > maxBlockHeight) {
        maxBlockHeight = parseInt(utxo.block);
      }
    }

    // Store UTXOs
    if (utxoRecords.length > 0) {
      await devxData.storeUTXOs(wallet.id, utxoRecords);
    }

    // Update lastFetchedBlockUtxos with highest block seen
    await devxData.updateWallet(wallet.id, {
      lastFetchedBlockUtxos: maxBlockHeight,
      lastSynced: Date.now(),
    });
  } catch (error) {
    console.error('Failed to sync wallet UTXOs:', error);
    throw error;
  }
}
