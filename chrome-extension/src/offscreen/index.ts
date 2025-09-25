// Offscreen document script for WASM operations
// This runs in an invisible document with DOM access and is built by Vite

console.log('Offscreen document loaded');

// CardanoWasm will be loaded here
let CardanoWasm: any = null;

// Status element for debugging
const statusDiv = document.getElementById('status');
const updateStatus = (message: string) => {
  console.log('Offscreen:', message);
  if (statusDiv) statusDiv.textContent = message;
};

// Load Cardano WASM library using the same approach as popup
async function loadCardanoWasm() {
  if (CardanoWasm) return CardanoWasm;

  try {
    updateStatus('Loading Cardano WASM...');

    // Use the same approach as cardano_loader.ts - this should work since Vite will process it
    CardanoWasm = await import('@emurgo/cardano-serialization-lib-browser');

    updateStatus('Cardano WASM loaded successfully');
    console.log('Offscreen WASM loaded:', CardanoWasm);
    return CardanoWasm;
  } catch (error) {
    const errorMessage = `Failed to load Cardano WASM: ${error instanceof Error ? error.message : 'Unknown error'}`;
    updateStatus(errorMessage);
    console.error('Offscreen WASM loading error:', error);
    throw new Error(errorMessage);
  }
}

// Generate a test root key using WASM
async function generateTestRootKey(): Promise<string> {
  try {
    updateStatus('Generating test root key...');

    // Ensure WASM is loaded
    const wasm = await loadCardanoWasm();

    // Test mnemonic for consistent testing
    const testMnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

    // Use @scure/bip39 for proper mnemonic to seed conversion (like in crypto.ts)
    const { mnemonicToSeed } = await import('@scure/bip39');
    const seed = await mnemonicToSeed(testMnemonic);

    // Create root key using Cardano WASM (same as crypto.ts)
    const rootKey = wasm.Bip32PrivateKey.from_bip39_entropy(
      seed.slice(0, 32), // First 32 bytes as entropy
      new Uint8Array(), // Empty passphrase
    );

    // Get the raw key bytes and convert to hex
    const keyBytes = rootKey.to_raw_key().as_bytes();
    const rootKeyHex = Array.from(keyBytes, (byte: number) => byte.toString(16).padStart(2, '0')).join('');

    updateStatus('Root key generated successfully');
    return rootKeyHex;
  } catch (error) {
    const errorMessage = `Failed to generate root key: ${error instanceof Error ? error.message : 'Unknown error'}`;
    updateStatus(errorMessage);
    console.error('Offscreen key generation error:', error);
    throw new Error(errorMessage);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Offscreen received message:', message);

  if (message.target !== 'offscreen') {
    return false; // Not for us
  }

  (async () => {
    try {
      switch (message.action) {
        case 'GENERATE_TEST_KEY':
          const rootKey = await generateTestRootKey();
          sendResponse({
            success: true,
            rootKey: rootKey,
          });
          break;

        case 'PING':
          sendResponse({
            success: true,
            message: 'Offscreen document is alive',
          });
          break;

        default:
          sendResponse({
            success: false,
            error: `Unknown action: ${message.action}`,
          });
      }
    } catch (error) {
      console.error('Offscreen error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })();

  return true; // Async response
});

// Debug: Check what's available in this context
console.log('Offscreen context info:', {
  hasWindow: typeof window !== 'undefined',
  hasDocument: typeof document !== 'undefined',
  hasChrome: typeof chrome !== 'undefined',
  location: window?.location?.href,
  baseURI: document?.baseURI,
});

// Initialize on load
updateStatus('Offscreen document ready, waiting for messages...');
