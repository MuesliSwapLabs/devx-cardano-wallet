import { devxData, devxSettings } from '@extension/storage';
import { syncWalletAssets, syncWalletTransactions, syncWalletUtxos } from '@extension/cardano-provider';
import type { Wallet } from '@extension/shared';
import type { SyncProgress } from '@extension/shared/lib/types/sync';
import { syncManager } from './syncManager';

// Blockfrost API configuration
const BLOCKFROST_API_URLS = {
  Mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0',
  Preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
};

async function getApiConfig(wallet: Wallet): Promise<{ apiUrl: string; apiKey: string }> {
  const settings = await devxSettings.get();
  const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

  if (!apiKey) {
    throw new Error(`No API key configured for ${wallet.network} network`);
  }

  return {
    apiUrl: BLOCKFROST_API_URLS[wallet.network],
    apiKey,
  };
}

export const handleSyncMessages = async (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
): Promise<boolean> => {
  try {
    switch (message.type) {
      case 'SYNC_ASSETS': {
        const { walletId } = message.payload;

        // Start or join assets sync
        await syncManager.startAssetsSync(walletId, async (abortSignal, onProgress) => {
          const wallet = await devxData.getWallet(walletId);
          if (!wallet) {
            throw new Error(`Wallet ${walletId} not found`);
          }

          const { apiUrl, apiKey } = await getApiConfig(wallet);

          // Get latest block height
          onProgress({
            status: 'progress',
            message: 'Fetching latest block height',
          });

          const latestBlockResponse = await fetch(`${apiUrl}/blocks/latest`, {
            headers: { project_id: apiKey },
            signal: abortSignal,
          });

          if (!latestBlockResponse.ok) {
            throw new Error('Failed to fetch latest block');
          }

          const latestBlock = await latestBlockResponse.json();

          // Call the sync function with progress callback
          await syncWalletAssets(wallet, latestBlock.height, apiUrl, apiKey, abortSignal, onProgress);
        });

        sendResponse({ success: true });
        return true;
      }

      case 'SYNC_TRANSACTIONS': {
        const { walletId } = message.payload;

        await syncManager.startTransactionsSync(walletId, async (abortSignal, onProgress) => {
          const wallet = await devxData.getWallet(walletId);
          if (!wallet) {
            throw new Error(`Wallet ${walletId} not found`);
          }

          const { apiUrl, apiKey } = await getApiConfig(wallet);

          // Get latest block height
          onProgress({
            status: 'progress',
            message: 'Fetching latest block height',
          });

          const latestBlockResponse = await fetch(`${apiUrl}/blocks/latest`, {
            headers: { project_id: apiKey },
            signal: abortSignal,
          });

          if (!latestBlockResponse.ok) {
            throw new Error('Failed to fetch latest block');
          }

          const latestBlock = await latestBlockResponse.json();

          // Call the sync function with progress callback
          await syncWalletTransactions(wallet, latestBlock.height, apiUrl, apiKey, abortSignal, onProgress);
        });

        sendResponse({ success: true });
        return true;
      }

      case 'SYNC_UTXOS': {
        const { walletId } = message.payload;

        await syncManager.startUtxosSync(walletId, async (abortSignal, onProgress) => {
          const wallet = await devxData.getWallet(walletId);
          if (!wallet) {
            throw new Error(`Wallet ${walletId} not found`);
          }

          const { apiUrl, apiKey } = await getApiConfig(wallet);

          // Get latest block height
          onProgress({
            status: 'progress',
            message: 'Fetching latest block height',
          });

          const latestBlockResponse = await fetch(`${apiUrl}/blocks/latest`, {
            headers: { project_id: apiKey },
            signal: abortSignal,
          });

          if (!latestBlockResponse.ok) {
            throw new Error('Failed to fetch latest block');
          }

          const latestBlock = await latestBlockResponse.json();

          // Get transactions for UTXO building
          const transactions = await devxData.getWalletTransactions(walletId);

          // Call the sync function with progress callback
          await syncWalletUtxos(wallet, transactions, latestBlock.height, apiUrl, apiKey, abortSignal, onProgress);
        });

        sendResponse({ success: true });
        return true;
      }

      case 'GET_SYNC_STATUS': {
        const { walletId } = message.payload;
        const status = syncManager.getSyncStatus(walletId);
        sendResponse({ success: true, status });
        return true;
      }

      case 'ABORT_SYNC': {
        const { walletId, syncType } = message.payload;
        syncManager.abortSync(walletId, syncType);
        sendResponse({ success: true });
        return true;
      }

      default:
        return false; // Message not handled
    }
  } catch (error) {
    console.error('Sync handler error:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return true;
  }
};
