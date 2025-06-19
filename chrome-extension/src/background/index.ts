import { settingsStorage, walletsStorage } from '@extension/storage';
import { createNewWallet, importWallet, spoofWallet } from '@extension/wallet-manager';
import { decrypt, encrypt } from '@extension/shared';
import type { Wallet } from '@extension/shared';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const wallets = await walletsStorage.get();
      const findWallet = (id: string): Wallet | undefined => wallets.find((w: Wallet) => w.id === id);

      switch (message.type) {
        case 'CREATE_WALLET': {
          const wallet = await createNewWallet(message.payload.name, message.payload.password);
          await walletsStorage.addWallet(wallet);
          sendResponse({ success: true, wallet });
          break;
        }

        case 'IMPORT_WALLET': {
          const wallet = await importWallet(message.payload.name, message.payload.seedPhrase, message.payload.password);
          await walletsStorage.addWallet(wallet);
          sendResponse({ success: true, wallet });
          break;
        }

        case 'SPOOF_WALLET': {
          try {
            const { address, name } = message.payload;
            const newWallet = await spoofWallet(name, address);
            console.log('adding Spoofed wallet:', newWallet);
            await walletsStorage.addWallet(newWallet);
            sendResponse({ success: true, payload: newWallet });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message + 'FUCK' : 'An unknown error occurred.',
            });
          }
          break;
        }

        // ... other cases remain the same ...
        case 'WALLET_RENAME': {
          await walletsStorage.updateWallet(message.payload.id, { name: message.payload.name });
          sendResponse({ success: true });
          break;
        }

        case 'VALIDATE_PASSWORD': {
          const wallet = findWallet(message.payload.id);
          if (!wallet || !wallet.secret) throw new Error('Wallet not found or has no secret.');
          try {
            await decrypt(wallet.secret, message.payload.password);
            sendResponse({ success: true, isValid: true });
          } catch (e) {
            sendResponse({ success: true, isValid: false });
          }
          break;
        }

        case 'ADD_PASSWORD': {
          const { id, newPassword } = message.payload;
          const wallet = findWallet(id);
          if (!wallet || wallet.hasPassword || !wallet.secret)
            throw new Error('Wallet not found, already has a password, or has no secret.');

          const newEncryptedSecret = await encrypt(wallet.secret, newPassword);
          await walletsStorage.updateWallet(id, { secret: newEncryptedSecret, hasPassword: true });
          sendResponse({ success: true });
          break;
        }

        case 'CHANGE_PASSWORD': {
          const { id, currentPassword, newPassword } = message.payload;
          const wallet = findWallet(id);
          if (!wallet || !wallet.secret) throw new Error('Wallet not found or has no secret.');
          const secret = await decrypt(wallet.secret, currentPassword);
          const newEncryptedSecret = await encrypt(secret, newPassword);
          await walletsStorage.updateWallet(id, { secret: newEncryptedSecret });
          sendResponse({ success: true });
          break;
        }

        case 'GET_DECRYPTED_SECRET': {
          const wallet = findWallet(message.payload.id);
          if (!wallet || !wallet.secret) {
            throw new Error('Wallet not found or has no secret.');
          }
          let secret: string;
          if (wallet.hasPassword) {
            secret = await decrypt(wallet.secret, message.payload.password);
          } else {
            secret = wallet.secret;
          }
          sendResponse({ success: true, secret });
          break;
        }
      }
    } catch (error) {
      console.error(`Error handling message type ${message.type}:`, error);
      sendResponse({ success: false, error: error.message + 'FACK' });
    }
  })();

  return true; // Indicates an async response
});
