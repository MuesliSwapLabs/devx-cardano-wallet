import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import { getCurrentPrice } from '@extension/shared/wallet';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

// The background script(s) run in the background. E.g. they might fetch
// the Cardano price every 20s while the user does other things. They might
// try to send money 10 times in the background while the user might do
// other things in the mean time.

// The way chrome extensions connect the "frontend" (e.g. popup) and the
// background scrip(s) is via messaging.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'checkCurrentPrice') {
    const result = getCurrentPrice();
    sendResponse({ price: result });
  }
  return true;
});
