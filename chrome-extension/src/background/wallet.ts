import { walletsStorage } from '@extension/storage';
import { createNewWallet, importWallet, spoofWallet } from '@extension/wallet-manager';
import { decrypt, encrypt } from '@extension/shared';
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
        const { name, network, password, seedPhrase, address } = message.payload;

        const wallet = await createNewWallet(name, network, password, seedPhrase, address);
        await walletsStorage.addWallet(wallet);
        sendResponse({ success: true, wallet });
        return true;
      }

      case 'IMPORT_WALLET': {
        // Validate mnemonic and derive address using direct crypto operations
        // const isValid = await validateMnemonic(message.payload.seedPhrase);
        const isValid = true; // Mock validation - always true for now
        if (!isValid) {
          sendResponse({ success: false, error: 'Invalid mnemonic seed phrase' });
          return true;
        }

        // const { address } = await deriveAddressFromMnemonic(message.payload.seedPhrase, message.payload.network);
        const address = 'test imported address yolo 42'; // Mock address

        const wallet = await importWallet(
          message.payload.name,
          message.payload.network,
          message.payload.seedPhrase,
          message.payload.password,
          address,
        );
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
        if (!wallet || !wallet.secret) throw new Error('Wallet not found or has no secret.');
        try {
          await decrypt(wallet.secret, message.payload.password);
          sendResponse({ success: true, isValid: true });
        } catch (e) {
          sendResponse({ success: true, isValid: false });
        }
        return true;
      }

      case 'ADD_PASSWORD': {
        const { id, newPassword } = message.payload;
        const wallet = findWallet(id);
        if (!wallet || wallet.hasPassword || !wallet.secret)
          throw new Error('Wallet not found, already has a password, or has no secret.');

        const newEncryptedSecret = await encrypt(wallet.secret, newPassword);
        await walletsStorage.updateWallet(id, { secret: newEncryptedSecret, hasPassword: true });
        sendResponse({ success: true });
        return true;
      }

      case 'CHANGE_PASSWORD': {
        const { id, currentPassword, newPassword } = message.payload;
        const wallet = findWallet(id);
        if (!wallet || !wallet.secret) throw new Error('Wallet not found or has no secret.');
        const secret = await decrypt(wallet.secret, currentPassword);
        const newEncryptedSecret = await encrypt(secret, newPassword);
        await walletsStorage.updateWallet(id, { secret: newEncryptedSecret });
        sendResponse({ success: true });
        return true;
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
