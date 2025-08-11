import { walletsStorage } from '@extension/storage';
import { createNewWallet, importWallet, spoofWallet } from '@extension/wallet-manager';
import { decrypt, encrypt } from '@extension/shared';
import { getTransactions } from '@extension/blockchain-provider';
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
