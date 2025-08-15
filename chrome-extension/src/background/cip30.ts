import { walletsStorage } from '@extension/storage';

// CIP-30 Permission Storage (in-memory for now)
const dappPermissions = new Map<string, { origin: string; approved: boolean; timestamp: number }>();
const pendingPermissions = new Map<string, { resolve: Function; reject: Function }>();

export const handleCip30Messages = async (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
): Promise<boolean> => {
  try {
    switch (message.type) {
      case 'CIP30_ENABLE_REQUEST': {
        const { origin } = message.payload;
        const tabId = sender.tab?.id;

        // Check if already approved
        const existingPermission = dappPermissions.get(origin);
        if (existingPermission?.approved) {
          sendResponse({ success: true, approved: true });
          return true;
        }

        // Open extension popup and navigate to permission page
        try {
          // Store pending request
          const permissionKey = `${origin}_${tabId}`;
          pendingPermissions.set(permissionKey, {
            resolve: (approved: boolean) => {
              if (approved) {
                dappPermissions.set(origin, {
                  origin,
                  approved: true,
                  timestamp: Date.now(),
                });
              }
              sendResponse({ success: true, approved });
            },
            reject: (error: any) => {
              sendResponse({ success: false, error });
            },
          });

          // Open extension popup with permission page
          await chrome.action.openPopup();

          // Send navigation message to popup
          setTimeout(() => {
            chrome.runtime.sendMessage({
              type: 'NAVIGATE_TO_PERMISSION',
              payload: {
                origin,
                tabId,
              },
            });
          }, 100); // Small delay to ensure popup is open
        } catch (error) {
          console.error('Failed to open extension popup:', error);
          sendResponse({ success: false, error: 'Failed to show permission dialog' });
        }
        return true;
      }

      case 'CIP30_PERMISSION_RESPONSE': {
        const { origin, approved, tabId } = message.payload;
        const permissionKey = `${origin}_${tabId}`;

        const pending = pendingPermissions.get(permissionKey);
        if (pending) {
          pending.resolve(approved);
          pendingPermissions.delete(permissionKey);
        }

        sendResponse({ success: true });
        return true;
      }

      case 'CIP30_IS_ENABLED_REQUEST': {
        const { origin } = message.payload;
        const permission = dappPermissions.get(origin);

        sendResponse({
          success: true,
          enabled: permission?.approved || false,
        });
        return true;
      }

      case 'CIP30_GET_NETWORK_ID': {
        // Get active wallet's network
        const currentWallet = await walletsStorage.getActiveWallet();

        if (!currentWallet) {
          sendResponse({
            success: false,
            error: { code: -1, info: 'No wallet available' },
          });
          return true;
        }

        console.log('CIP30_GET_NETWORK_ID: Using wallet:', currentWallet.name, 'Network:', currentWallet.network);

        sendResponse({
          success: true,
          network: currentWallet.network,
        });
        return true;
      }

      case 'CIP30_GET_UTXOS': {
        // Get active wallet's UTXOs
        const currentWallet = await walletsStorage.getActiveWallet();

        if (!currentWallet) {
          sendResponse({
            success: false,
            error: { code: -2, info: 'No wallet available' },
          });
          return true;
        }

        console.log('CIP30_GET_UTXOS: Using wallet:', currentWallet.name);

        // For now, return empty UTXOs (would need proper UTXO management)
        sendResponse({
          success: true,
          utxos: [], // TODO: Implement actual UTXO retrieval
        });
        return true;
      }

      case 'CIP30_GET_BALANCE': {
        // Get active wallet's balance
        const currentWallet = await walletsStorage.getActiveWallet();

        if (!currentWallet) {
          sendResponse({
            success: false,
            error: { code: -3, info: 'No wallet available' },
          });
          return true;
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
            return true;
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
        return true;
      }

      case 'CIP30_GET_WALLET_NAME': {
        // Get active wallet's name
        const currentWallet = await walletsStorage.getActiveWallet();

        if (!currentWallet) {
          sendResponse({
            success: false,
            error: { code: -5, info: 'No wallet available' },
          });
          return true;
        }

        console.log('CIP30_GET_WALLET_NAME: Using wallet:', currentWallet.name);

        sendResponse({
          success: true,
          name: currentWallet.name,
        });
        return true;
      }

      default:
        // Not a CIP-30 message, let other handlers deal with it
        return false;
    }
  } catch (error) {
    console.error(`Error handling CIP-30 message type ${message.type}:`, error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' });
    return true;
  }
};
