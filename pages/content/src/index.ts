import { Messaging } from '@extension/shared';

// CIP30 Injection
const injectScript = () => {
  const script = document.createElement('script');
  script.async = false;
  script.src = chrome.runtime.getURL('inject/index.iife.js');
  script.onload = script.remove;
  (document.head || document.documentElement).appendChild(script);
};

console.log('Injecting CIP30 connector');
injectScript();

console.log('Creating CIP30 listener');
const app = Messaging.createBackgroundController();
app.listen();

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

console.log('DevX CIP-30 message bridge initialized');
