// chrome-extension/src/background/index.ts
import { walletsStorage } from '@extension/storage';
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
          const wallet = spoofWallet(message.payload.name, message.payload.address);
          await walletsStorage.addWallet(wallet);
          sendResponse({ success: true, wallet });
          break;
        }

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
          console.log('Changing password for walletè!!!!!:', message.payload.id);
          const { id, currentPassword, newPassword } = message.payload;
          console.log('currentPassword:', currentPassword);
          console.log('newPassword:', newPassword);
          const wallet = findWallet(id);
          if (!wallet || !wallet.secret) throw new Error('Wallet not found or has no secret.');

          // Decrypt with the old password (this also verifies it)
          const secret = await decrypt(wallet.secret, currentPassword);
          console.log('decrypted secret:', secret);
          // Re-encrypt with the new password
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
          // If the wallet has a password, decrypt the secret.
          if (wallet.hasPassword) {
            // The decrypt function itself already removes the prefix.
            secret = await decrypt(wallet.secret, message.payload.password);
          } else {
            // If there's no password, the secret is already in plaintext.
            secret = wallet.secret;
          }
          // The `secret` variable now holds the clean seed phrase.
          sendResponse({ success: true, secret });
          break;
        }
      }
    } catch (error) {
      console.error(`Error handling message type ${message.type}:`, error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Indicates an async response
});
