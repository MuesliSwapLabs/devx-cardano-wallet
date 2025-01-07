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
