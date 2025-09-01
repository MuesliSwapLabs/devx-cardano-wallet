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

          // The stored balance is already in lovelaces from Blockfrost
          // No need to multiply by 1,000,000 since it's not in ADA format
          const balanceLovelace = parseInt(storedBalance);

          if (isNaN(balanceLovelace)) {
            console.error('Could not parse balance as lovelaces:', storedBalance);
            sendResponse({
              success: false,
              error: { code: -4, info: 'Invalid balance format' },
            });
            return true;
          }

          console.log('Balance conversion:', {
            original: storedBalance,
            lovelace: balanceLovelace,
          });

          sendResponse({
            success: true,
            balance: balanceLovelace.toString(),
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

      case 'CIP30_GET_REWARD_ADDRESSES': {
        // Get active wallet's reward addresses (stake address)
        const currentWallet = await walletsStorage.getActiveWallet();

        if (!currentWallet) {
          sendResponse({
            success: false,
            error: { code: -6, info: 'No wallet available' },
          });
          return true;
        }

        console.log('CIP30_GET_REWARD_ADDRESSES: Using wallet:', currentWallet.name);
        console.log('CIP30_GET_REWARD_ADDRESSES: Wallet stakeAddress:', currentWallet.stakeAddress);
        console.log('CIP30_GET_REWARD_ADDRESSES: Full wallet object keys:', Object.keys(currentWallet));

        // Return array containing the wallet's stake address
        sendResponse({
          success: true,
          rewardAddresses: [currentWallet.stakeAddress],
        });
        return true;
      }

      case 'CIP30_GET_USED_ADDRESSES': {
        // Get active wallet's used addresses (wallet address)
        const currentWallet = await walletsStorage.getActiveWallet();

        if (!currentWallet) {
          sendResponse({
            success: false,
            error: { code: -7, info: 'No wallet available' },
          });
          return true;
        }

        console.log('CIP30_GET_USED_ADDRESSES: Using wallet:', currentWallet.name);

        // Return array containing the wallet's address
        sendResponse({
          success: true,
          addresses: [currentWallet.address],
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
