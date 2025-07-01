import { settingsStorage, walletsStorage } from '@extension/storage';
import { createNewWallet, importWallet, spoofWallet } from '@extension/wallet-manager';
import { decrypt, encrypt } from '@extension/shared';
import type { Wallet } from '@extension/shared';

// CIP-30 Permission Storage (in-memory for now)
const dappPermissions = new Map<string, { origin: string; approved: boolean; timestamp: number }>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const walletsData = await walletsStorage.get();
      const findWallet = (id: string): Wallet | undefined => walletsData.wallets.find((w: Wallet) => w.id === id);

      switch (message.type) {
        // CIP-30 Message Handlers
        case 'CIP30_ENABLE_REQUEST': {
          const { origin } = message.payload;

          // For now, auto-approve all requests (in real implementation, show popup)
          // TODO: Show actual permission popup to user
          dappPermissions.set(origin, {
            origin,
            approved: true,
            timestamp: Date.now(),
          });

          sendResponse({ success: true, approved: true });
          break;
        }

        case 'CIP30_IS_ENABLED_REQUEST': {
          const { origin } = message.payload;
          const permission = dappPermissions.get(origin);

          sendResponse({
            success: true,
            enabled: permission?.approved || false,
          });
          break;
        }

        case 'CIP30_GET_NETWORK_ID': {
          // Get active wallet's network
          const currentWallet = await walletsStorage.getActiveWallet();

          if (!currentWallet) {
            sendResponse({
              success: false,
              error: { code: -1, info: 'No wallet available' },
            });
            break;
          }

          console.log('CIP30_GET_NETWORK_ID: Using wallet:', currentWallet.name, 'Network:', currentWallet.network);

          sendResponse({
            success: true,
            network: currentWallet.network,
          });
          break;
        }

        case 'CIP30_GET_UTXOS': {
          // Get active wallet's UTXOs
          const currentWallet = await walletsStorage.getActiveWallet();

          if (!currentWallet) {
            sendResponse({
              success: false,
              error: { code: -2, info: 'No wallet available' },
            });
            break;
          }

          console.log('CIP30_GET_UTXOS: Using wallet:', currentWallet.name);

          // For now, return empty UTXOs (would need proper UTXO management)
          sendResponse({
            success: true,
            utxos: [], // TODO: Implement actual UTXO retrieval
          });
          break;
        }

        case 'CIP30_GET_BALANCE': {
          // Get active wallet's balance
          const currentWallet = await walletsStorage.getActiveWallet();

          if (!currentWallet) {
            sendResponse({
              success: false,
              error: { code: -3, info: 'No wallet available' },
            });
            break;
          }

          console.log('CIP30_GET_BALANCE: Using wallet:', currentWallet.name);

          try {
            // SIMPLIFIED: Use the wallet's stored balance directly instead of calling getWalletState
            // This ensures we get the balance that was fetched when the wallet was spoofed/created
            const storedBalance = currentWallet.balance;

            console.log('CIP30_GET_BALANCE: Wallet stored balance:', storedBalance);

            // Parse balance string, removing commas, currency symbols, and whitespace
            const cleanBalanceStr = storedBalance.replace(/[,\s₳]/g, '');
            const balanceFloat = parseFloat(cleanBalanceStr);

            if (isNaN(balanceFloat)) {
              console.error('Could not parse balance:', storedBalance);
              sendResponse({
                success: false,
                error: { code: -4, info: 'Invalid balance format' },
              });
              break;
            }

            // Convert to lovelace (1 ADA = 1,000,000 lovelace)
            const balanceLovelace = Math.floor(balanceFloat * 1_000_000);

            // Convert balance to CBOR hex format
            const balanceHex = balanceLovelace.toString(16);

            console.log('Balance conversion:', {
              original: storedBalance,
              cleaned: cleanBalanceStr,
              float: balanceFloat,
              lovelace: balanceLovelace,
              hex: balanceHex,
            });

            sendResponse({
              success: true,
              balance: balanceHex,
            });
          } catch (error) {
            console.error('Error getting balance:', error);
            sendResponse({
              success: false,
              error: { code: -4, info: 'Failed to get balance' },
            });
          }
          break;
        }

        case 'CIP30_GET_WALLET_NAME': {
          // Get active wallet's name
          const currentWallet = await walletsStorage.getActiveWallet();

          if (!currentWallet) {
            sendResponse({
              success: false,
              error: { code: -5, info: 'No wallet available' },
            });
            break;
          }

          console.log('CIP30_GET_WALLET_NAME: Using wallet:', currentWallet.name);

          sendResponse({
            success: true,
            name: currentWallet.name,
          });
          break;
        }

        // Existing wallet management handlers
        case 'CREATE_WALLET': {
          const wallet = await createNewWallet(message.payload.name, message.payload.network, message.payload.password);
          await walletsStorage.addWallet(wallet);
          sendResponse({ success: true, wallet });
          break;
        }

        case 'IMPORT_WALLET': {
          const wallet = await importWallet(
            message.payload.name,
            message.payload.network,
            message.payload.seedPhrase,
            message.payload.password,
          );
          await walletsStorage.addWallet(wallet);
          sendResponse({ success: true, wallet });
          break;
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
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' });
    }
  })();

  return true; // Indicates an async response
});
