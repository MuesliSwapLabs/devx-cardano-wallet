import { Messaging } from '@extension/shared';
import { cborConverter } from './cbor-converter';

// CIP30 Injection
const injectScript = () => {
  const script = document.createElement('script');
  script.async = false;
  script.src = chrome.runtime.getURL('inject/index.iife.js');
  script.onload = script.remove;
  (document.head || document.documentElement).appendChild(script);
};

injectScript();

const app = Messaging.createBackgroundController();
app.listen();

// Initialize CBOR converter
cborConverter.initialize().catch(error => {
  console.error('Failed to initialize CBOR converter:', error);
});

// Listen for messages from inject script (page context)
window.addEventListener('message', async event => {
  // Only accept messages from same window
  if (event.source !== window) return;

  // Only handle DevX CIP-30 requests
  if (event.data.type !== 'DEVX_CIP30_REQUEST') return;

  const { messageId, message } = event.data;

  try {
    // Forward message to background script
    const response = await chrome.runtime.sendMessage(message);

    // Handle UTXO responses with CBOR encoding
    if (message.type === 'CIP30_GET_UTXOS' && response.success && response.utxos && Array.isArray(response.utxos)) {
      try {
        const cborUtxos = cborConverter.convertUtxosToCbor(response.utxos);
        response.utxos = cborUtxos;
      } catch (cborError) {
        console.error('CBOR conversion failed:', cborError);
        // Fall back to original response if CBOR conversion fails
      }
    }

    // Send response back to inject script
    window.postMessage(
      {
        type: 'DEVX_CIP30_RESPONSE',
        messageId: messageId,
        response: response,
      },
      '*',
    );
  } catch (error) {
    // Send error response back to inject script
    window.postMessage(
      {
        type: 'DEVX_CIP30_RESPONSE',
        messageId: messageId,
        response: {
          success: false,
          error: {
            code: -1,
            info: error instanceof Error ? error.message : 'Communication failed',
          },
        },
      },
      '*',
    );
  }
});
