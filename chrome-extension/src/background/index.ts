import { walletsStorage } from '@extension/storage';
import { createNewWallet, importWallet, spoofWallet } from '@extension/wallet-manager';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let promise: Promise<void>;

  switch (message.type) {
    case 'CREATE_WALLET': {
      const wallet = createNewWallet(message.payload.name, message.payload.password);
      promise = walletsStorage.addWallet(wallet).then(() => {
        sendResponse({ success: true, wallet });
      });
      break;
    }

    case 'IMPORT_WALLET': {
      const wallet = importWallet(message.payload.name, message.payload.seedPhrase, message.payload.password);
      promise = walletsStorage.addWallet(wallet).then(() => {
        sendResponse({ success: true, wallet });
      });
      break;
    }

    case 'SPOOF_WALLET': {
      const wallet = spoofWallet(message.payload.name, message.payload.address);
      promise = walletsStorage.addWallet(wallet).then(() => {
        sendResponse({ success: true, wallet });
      });
      break;
    }

    default:
      // Exit early if the message type is not recognized
      return false;
  }

  // Handle errors and indicate that the response will be sent asynchronously
  promise.catch(error => {
    sendResponse({ success: false, error: error.message });
  });

  return true;
});
