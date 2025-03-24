import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import '@src/index.css'; // We'll update this CSS below
import { useStorage } from '@extension/shared';
import { exampleThemeStorage, appStateStorage } from '@extension/storage';
import Popup from '@src/Popup';
import Onboarding from '@src/Onboarding';
import AddWallet from './onboarding/addWallet';
import LegalAndAnalytics from './onboarding/legalAndAnalytics';
import CreateNewWallet from './onboarding/createNewWallet';
import CreateNewWalletSuccess from './onboarding/createNewWalletSuccess';
import SpoofWallet from './onboarding/spoofWallet';
import SpoofWalletSuccess from './onboarding/spoofWalletSuccess';
import ImportWalletFromSeedPhrase from './onboarding/importWalletFromSeedPhrase';
import ImportWalletFromSeedPhraseSuccess from './onboarding/importWalletFromSeedPhraseSuccess';

import { getCurrentPrice } from '@extension/shared/wallet';

const ThemeToggle = () => {
  const theme = useStorage(exampleThemeStorage);
  const isDark = theme === 'dark';

  return (
    <label
      htmlFor="theme-toggle"
      className="relative inline-block h-8 w-14 cursor-pointer rounded-full bg-gray-300 transition dark:bg-gray-600">
      <input
        type="checkbox"
        id="theme-toggle"
        className="peer sr-only"
        checked={isDark}
        onChange={() => exampleThemeStorage.toggle()}
      />
      <span className="absolute inset-y-0 start-0 m-1 size-6 rounded-full bg-white transition-all peer-checked:translate-x-6"></span>
    </label>
  );
};

function Root() {
  const theme = useStorage(exampleThemeStorage);
  const appState = useStorage(appStateStorage);
  const isDark = theme === 'dark';
  const iconUrl = isDark ? chrome.runtime.getURL('icon-dark.svg') : chrome.runtime.getURL('icon-light.svg');

  // Note: getItem() uses the storage's snapshot function, which basically
  // does some kind of caching. This is important to achieve reactivity later on.
  const [onboarded, setOnboarded] = useState(() => {
    return appStateStorage.getItem('onboarded') ?? false;
  });

  // To make the storage's member var "onboarded" reactive, we use the
  // subscribe() method.
  useEffect(() => {
    const unsubscribe = appStateStorage.subscribe(() => {
      const newOnboarded = appStateStorage.getItem('onboarded') ?? false;
      setOnboarded(newOnboarded);
    });

    return () => unsubscribe();
  }, []);

  // price and update function are just for demonstration purposes
  const [price, setPrice] = useState(() => {
    // Use the shared function to get the default value
    return getCurrentPrice();
  });

  // Update price by making a request to the background script
  const updatePrice = async () => {
    chrome.runtime.sendMessage({ type: 'checkCurrentPrice', price }, response => {
      console.log('Response:', response);
      setPrice(response.price);
    });
  };

  return (
    <Router>
      <div className={isDark ? 'dark' : ''}>
        <div className="App dark:bg-gray-800 bg-slate-50 dark:text-white text-black flex flex-col h-screen">
          <header className="App-header flex items-center justify-between px-4 py-3">
            <img src={iconUrl} alt="icon" width="34" height="34" />
            <span className="mx-auto text-lg font-semibold">{onboarded ? 'Welcome' : 'Onboarding'}</span>
            <div className="scale-50 flex items-center">
              <ThemeToggle />
            </div>
          </header>

          <main className="p-4 flex-1 overflow-auto">
            <Routes>
              {/* "/" - Onboarding vs. Popup*/}
              <Route path="/" element={onboarded ? <Popup /> : <Navigate to="/onboarding" replace />} />

              {/* Onboarding routes */}
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/onboarding/legal-and-analytics" element={<LegalAndAnalytics />} />
              <Route path="/onboarding/add-wallet" element={<AddWallet />} />

              <Route path="/onboarding/create-new-wallet" element={<CreateNewWallet />} />
              <Route path="/onboarding/create-new-wallet-success" element={<CreateNewWalletSuccess />} />

              <Route path="/onboarding/spoof-wallet" element={<SpoofWallet />} />
              <Route path="/onboarding/spoof-wallet-success" element={<SpoofWalletSuccess />} />

              <Route path="/onboarding/import-wallet-from-seed-phrase" element={<ImportWalletFromSeedPhrase />} />
              <Route
                path="/onboarding/import-wallet-from-seed-phrase-success"
                element={<ImportWalletFromSeedPhraseSuccess />}
              />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="App-footer p-4 border-t text-center">
            Price: {String(price)}
            <button
              className="bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              onClick={() => {
                updatePrice();
              }}>
              Update price
            </button>
          </footer>
        </div>
      </div>
    </Router>
  );
}

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Cannot find #app-container');
  }

  const root = createRoot(appContainer);
  root.render(<Root />);
}

init();
