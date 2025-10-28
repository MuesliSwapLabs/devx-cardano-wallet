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
    const cachedAddresses = wallet.paymentAddresses || [];
    const lastCheckedBlock = wallet.lastFetchedBlockPaymentAddresses || 0;

    // If we have cached addresses AND already checked at this block (or later), return cache
    if (cachedAddresses.length > 0 && lastCheckedBlock >= currentBlockHeight) {
      return cachedAddresses;
    }

    // Get API client
    const settings = await devxSettings.get();
    const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

    if (!apiKey) {
      throw new Error(`No API key configured for ${wallet.network} network`);
    }

    const client = new BlockfrostClient({ apiKey, network: wallet.network });

    // If we have cached addresses, do a cheap check for NEW addresses
    if (cachedAddresses.length > 0) {
      // Check the next page after our cached addresses
      const nextPage = Math.ceil(cachedAddresses.length / 100) + 1;
      const checkNewAddresses = await client.getAccountAddresses(wallet.stakeAddress as any, {
        count: 1,
        page: nextPage,
      });

      // If no new addresses, update lastFetchedBlock and return cached
      if (checkNewAddresses.length === 0) {
        await devxData.updateWallet(wallet.id, {
          lastFetchedBlockPaymentAddresses: currentBlockHeight,
        });
        return cachedAddresses;
      }

      // New addresses exist! Fetch all new pages
      const newAddresses: string[] = [];
      let page = nextPage;

      while (true) {
        const pageAddresses = await client.getAccountAddresses(wallet.stakeAddress as any, {
          count: 100,
          page,
        });

        if (pageAddresses.length === 0) break;
        newAddresses.push(...pageAddresses.map(addr => addr.address));
        if (pageAddresses.length < 100) break;
        page++;
      }

      // Merge and update cache
      const allAddresses = [...cachedAddresses, ...newAddresses];
      await devxData.updateWallet(wallet.id, {
        paymentAddresses: allAddresses,
        lastFetchedBlockPaymentAddresses: currentBlockHeight,
      });

      return allAddresses;
    }

    // No cache: fetch ALL payment addresses with pagination
    const allAddresses: string[] = [];
    let page = 1;

    while (true) {
      const pageAddresses = await client.getAccountAddresses(wallet.stakeAddress as any, {
        count: 100,
        page,
      });

      if (pageAddresses.length === 0) break;
      allAddresses.push(...pageAddresses.map(addr => addr.address));
      if (pageAddresses.length < 100) break;
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
