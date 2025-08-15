import { walletsStorage, transactionsStorage } from '@extension/storage';
import { WalletSyncService } from '@extension/blockchain-provider';
import { createNewWallet, importWallet, spoofWallet } from '@extension/wallet-manager';
import { decrypt, encrypt } from '@extension/shared';
import { getTransactions, getWalletUTXOs, getEnhancedTransactions } from '@extension/blockchain-provider';
import { UnifiedSyncService } from './unifiedSyncService';
import type { Wallet } from '@extension/shared';
// Crypto operations moved to frontend - no longer needed in background

export const handleWalletMessages = async (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
): Promise<boolean> => {
  try {
    const walletsData = await walletsStorage.get();
    const findWallet = (id: string): Wallet | undefined => walletsData.wallets.find((w: Wallet) => w.id === id);

    switch (message.type) {
      case 'CREATE_WALLET': {
        // Receive complete data from frontend - crypto operations already done in popup
        const { name, network, password, seedPhrase, address, stakeAddress, rootKey } = message.payload;

        const wallet = await createNewWallet(name, network, password, seedPhrase, address, stakeAddress, rootKey);
        await walletsStorage.addWallet(wallet);
        sendResponse({ success: true, wallet });
        return true;
      }

      case 'IMPORT_WALLET': {
        // Receive complete data from frontend - crypto operations already done in popup
        const { name, network, seedPhrase, address, stakeAddress, password, rootKey } = message.payload;

        const wallet = await importWallet(name, network, seedPhrase, password, address, stakeAddress, rootKey);
        await walletsStorage.addWallet(wallet);
        sendResponse({ success: true, wallet });
        return true;
      }

      case 'SPOOF_WALLET': {
        try {
          const { address, name, network } = message.payload;
          const newWallet = await spoofWallet(name, address, network);
          console.log('adding Spoofed wallet:', newWallet);
          await walletsStorage.addWallet(newWallet);
          sendResponse({ success: true, payload: newWallet });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'An unknown error occurred.',
          });
        }
        return true;
      }

      case 'WALLET_RENAME': {
        await walletsStorage.updateWallet(message.payload.id, { name: message.payload.name });
        sendResponse({ success: true });
        return true;
      }

      case 'VALIDATE_PASSWORD': {
        const wallet = findWallet(message.payload.id);
        if (!wallet || !wallet.seedPhrase) throw new Error('Wallet not found or has no seedPhrase.');
        try {
          await decrypt(wallet.seedPhrase, message.payload.password);
          sendResponse({ success: true, isValid: true });
        } catch (e) {
          sendResponse({ success: true, isValid: false });
        }
        return true;
      }

      case 'ADD_PASSWORD': {
        const { id, newPassword } = message.payload;
        const wallet = findWallet(id);
        if (!wallet || wallet.hasPassword || !wallet.seedPhrase)
          throw new Error('Wallet not found, already has a password, or has no seedPhrase.');

        const newEncryptedSeedPhrase = await encrypt(wallet.seedPhrase, newPassword);
        const newEncryptedRootKey = wallet.rootKey ? await encrypt(wallet.rootKey, newPassword) : null;
        await walletsStorage.updateWallet(id, {
          seedPhrase: newEncryptedSeedPhrase,
          rootKey: newEncryptedRootKey,
          hasPassword: true,
        });
        sendResponse({ success: true });
        return true;
      }

      case 'CHANGE_PASSWORD': {
        const { id, currentPassword, newPassword } = message.payload;
        const wallet = findWallet(id);
        if (!wallet || !wallet.seedPhrase) throw new Error('Wallet not found or has no seedPhrase.');
        const seedPhrase = await decrypt(wallet.seedPhrase, currentPassword);
        const rootKey = wallet.rootKey ? await decrypt(wallet.rootKey, currentPassword) : null;
        const newEncryptedSeedPhrase = await encrypt(seedPhrase, newPassword);
        const newEncryptedRootKey = rootKey ? await encrypt(rootKey, newPassword) : null;
        await walletsStorage.updateWallet(id, {
          seedPhrase: newEncryptedSeedPhrase,
          rootKey: newEncryptedRootKey,
        });
        sendResponse({ success: true });
        return true;
      }

      case 'GET_DECRYPTED_SECRET': {
        const wallet = findWallet(message.payload.id);
        if (!wallet || !wallet.seedPhrase) {
          throw new Error('Wallet not found or has no seedPhrase.');
        }
        let seedPhrase: string;
        if (wallet.hasPassword) {
          seedPhrase = await decrypt(wallet.seedPhrase, message.payload.password);
        } else {
          seedPhrase = wallet.seedPhrase;
        }
        sendResponse({ success: true, secret: seedPhrase });
        return true;
      }

      case 'GET_TRANSACTIONS': {
        const wallet = findWallet(message.payload.walletId);
        if (!wallet) {
          throw new Error('Wallet not found.');
        }

        try {
          const transactions = await getTransactions(wallet);
          sendResponse({ success: true, transactions });
        } catch (error) {
          console.error('Failed to fetch transactions:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transactions';
          sendResponse({ success: false, error: errorMessage });
        }
        return true;
      }

      case 'GET_ENHANCED_TRANSACTIONS': {
        const wallet = findWallet(message.payload.walletId);
        if (!wallet) {
          throw new Error('Wallet not found.');
        }

        try {
          // Check if data is stale and trigger sync if needed
          const syncStatus = await UnifiedSyncService.getSyncStatus(wallet.id);

          if (syncStatus.isStale && !syncStatus.isActive) {
            // Trigger background sync but don't wait for it
            UnifiedSyncService.syncWallet(wallet.id, false).catch(error =>
              console.warn('Background sync failed:', error),
            );
          }

          // Always return cached data immediately
          const { transactions } = await UnifiedSyncService.getCachedData(wallet.id);
          sendResponse({ success: true, transactions, syncStatus });
        } catch (error) {
          console.error('Failed to fetch enhanced transactions:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch enhanced transactions';
          sendResponse({ success: false, error: errorMessage });
        }
        return true;
      }

      case 'GET_WALLET_UTXOS': {
        const { walletId, includeSpent = false } = message.payload;
        const wallet = findWallet(walletId);
        if (!wallet) {
          throw new Error('Wallet not found.');
        }

        try {
          // Check if data is stale and trigger sync if needed
          const syncStatus = await UnifiedSyncService.getSyncStatus(wallet.id);

          if (syncStatus.isStale && !syncStatus.isActive) {
            // Trigger background sync but don't wait for it
            UnifiedSyncService.syncWallet(wallet.id, false).catch(error =>
              console.warn('Background sync failed:', error),
            );
          }

          // Always return cached data immediately
          const { utxos } = await UnifiedSyncService.getCachedData(wallet.id);
          const filteredUtxos = includeSpent ? utxos : utxos.filter(utxo => !utxo.isSpent);
          sendResponse({ success: true, utxos: filteredUtxos, syncStatus });
        } catch (error) {
          console.error('Failed to fetch wallet UTXOs:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch wallet UTXOs';
          sendResponse({ success: false, error: errorMessage });
        }
        return true;
      }

      case 'GET_UTXO_DETAILS': {
        const { txHash, outputIndex } = message.payload;

        try {
          const utxo = await transactionsStorage.getUTXO(txHash, outputIndex);
          if (!utxo) {
            sendResponse({ success: false, error: 'UTXO not found' });
            return true;
          }
          sendResponse({ success: true, utxo });
        } catch (error) {
          console.error('Failed to fetch UTXO details:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch UTXO details';
          sendResponse({ success: false, error: errorMessage });
        }
        return true;
      }

      case 'SYNC_WALLET': {
        const { walletId, forceFullSync = false } = message.payload;
        const wallet = findWallet(walletId);
        if (!wallet) {
          throw new Error('Wallet not found.');
        }

        try {
          const result = await UnifiedSyncService.syncWallet(walletId, forceFullSync);
          sendResponse({ success: true, result });
        } catch (error) {
          console.error('Failed to sync wallet:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to sync wallet';
          sendResponse({ success: false, error: errorMessage });
        }
        return true;
      }

      case 'GET_SYNC_STATUS': {
        const { walletId } = message.payload;

        try {
          const status = await UnifiedSyncService.getSyncStatus(walletId);
          sendResponse({ success: true, status });
        } catch (error) {
          console.error('Failed to get sync status:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to get sync status';
          sendResponse({ success: false, error: errorMessage });
        }
        return true;
      }

      case 'GET_STORAGE_STATS': {
        try {
          const stats = await transactionsStorage.getStats();
          sendResponse({ success: true, stats });
        } catch (error) {
          console.error('Failed to get storage stats:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to get storage stats';
          sendResponse({ success: false, error: errorMessage });
        }
        return true;
      }

      case 'RESET_WALLET_DATA': {
        const { walletId } = message.payload;
        const wallet = findWallet(walletId);
        if (!wallet) {
          throw new Error('Wallet not found.');
        }

        try {
          const result = await WalletSyncService.resetAndResync(wallet);
          sendResponse({ success: true, result });
        } catch (error) {
          console.error('Failed to reset wallet data:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to reset wallet data';
          sendResponse({ success: false, error: errorMessage });
        }
        return true;
      }

      default:
        // Not a wallet message, let other handlers deal with it
        return false;
    }
  } catch (error) {
    console.error(`Error handling wallet message type ${message.type}:`, error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' });
    return true;
  }
};
