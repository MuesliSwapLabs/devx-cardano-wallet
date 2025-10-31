import { handleCip30Messages } from './cip30';
import { handleWalletMessages } from './wallet';

// Offscreen document management
let offscreenDocumentExists = false;

async function createOffscreenDocument() {
  if (offscreenDocumentExists) return;

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS' as chrome.offscreen.Reason],
      justification: 'Need DOM context for Cardano WASM operations',
    });
    offscreenDocumentExists = true;
    console.log('Offscreen document created successfully');
  } catch (error) {
    console.error('Failed to create offscreen document:', error);
    throw error;
  }
}

async function handleTestOffscreenWasm(sendResponse: (response?: any) => void) {
  try {
    // Create offscreen document if it doesn't exist
    await createOffscreenDocument();

    // Send message to offscreen document to generate test key
    const response = await chrome.runtime.sendMessage({
      target: 'offscreen',
      action: 'GENERATE_TEST_KEY',
    });

    sendResponse(response);
  } catch (error) {
    console.error('Test offscreen WASM error:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    // Handle offscreen WASM test
    if (message.type === 'TEST_OFFSCREEN_WASM') {
      await handleTestOffscreenWasm(sendResponse);
      return;
    }

    // Try CIP-30 handlers first
    const cip30Handled = await handleCip30Messages(message, sender, sendResponse);
    if (cip30Handled) return;

    // Try wallet handlers next
    const walletHandled = await handleWalletMessages(message, sender, sendResponse);
    if (walletHandled) return;

    // If no handler processed the message, send an error response
    console.warn(`Unknown message type: ${message.type}`);
    sendResponse({
      success: false,
      error: `Unknown message type: ${message.type}`,
    });
  })();

  return true; // Indicates an async response
});

// Clean up offscreen document when extension shuts down
chrome.runtime.onSuspend.addListener(() => {
  if (offscreenDocumentExists) {
    chrome.offscreen.closeDocument();
    offscreenDocumentExists = false;
  }
});
