import type { WalletRecord } from '@extension/storage';
import { devxSettings, devxData } from '@extension/storage';
import { BlockfrostClient } from '../client/blockfrost';

/**
 * Syncs and caches wallet payment addresses
 * Returns cached addresses if they exist and are recent, otherwise fetches fresh ones
 * @param wallet - Wallet record to sync
 * @param currentBlockHeight - Current blockchain block height for sync tracking
 * @returns Array of payment address strings belonging to this wallet
 */
export async function syncWalletPaymentAddresses(wallet: WalletRecord, currentBlockHeight: number): Promise<string[]> {
  try {
    // Check if we have cached addresses
    if (wallet.paymentAddresses && wallet.paymentAddresses.length > 0) {
      // Return cached addresses (they don't change often, so no need to re-fetch every time)
      return wallet.paymentAddresses;
    }

    // Fetch fresh payment addresses from Blockfrost
    const settings = await devxSettings.get();
    const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

    if (!apiKey) {
      throw new Error(`No API key configured for ${wallet.network} network`);
    }

    const client = new BlockfrostClient({ apiKey, network: wallet.network });

    // Fetch ALL payment addresses with pagination
    const allAddresses: string[] = [];
    let page = 1;

    while (true) {
      const pageAddresses = await client.getAccountAddresses(wallet.stakeAddress as any, {
        count: 100,
        page,
      });

      if (pageAddresses.length === 0) break;
      allAddresses.push(...pageAddresses.map(addr => addr.address));
      if (pageAddresses.length < 100) break; // Stop if less than limit
      page++;
    }

    // Cache the addresses in wallet record
    await devxData.updateWallet(wallet.id, {
      paymentAddresses: allAddresses,
      lastFetchedBlockPaymentAddresses: currentBlockHeight,
    });

    return allAddresses;
  } catch (error) {
    console.error('Failed to sync wallet payment addresses:', error);
    throw error;
  }
}
