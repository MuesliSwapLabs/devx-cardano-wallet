import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import '@src/index.css';
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

function Root() {
  const theme = useStorage(exampleThemeStorage);
  const appState = useStorage(appStateStorage);
  const isDark = theme === 'dark';
  const iconUrl = isDark ? chrome.runtime.getURL('icon-dark.svg') : chrome.runtime.getURL('icon-light.svg');

  // State for dropdown and content view
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeView, setActiveView] = useState('assets'); // Default to assets view
  const [selectedWallet, setSelectedWallet] = useState('My Wallet'); // Default wallet

  // Sample wallet list
  const wallets = [
    { id: 1, name: 'My Wallet' },
    { id: 2, name: 'Trading Wallet' },
    { id: 3, name: 'Savings Wallet' },
    { id: 4, name: 'DeFi Wallet' },
  ];

  // State for onboarded status
  const [onboarded, setOnboarded] = useState(() => {
    return appStateStorage.getItem('onboarded') ?? false;
  });

  // Subscribe to onboarded status changes
  useEffect(() => {
    const unsubscribe = appStateStorage.subscribe(() => {
      const newOnboarded = appStateStorage.getItem('onboarded') ?? false;
      setOnboarded(newOnboarded);
    });

    return () => unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (dropdownOpen) {
      const handleClickOutside = () => setDropdownOpen(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  // Handle wallet selection
  const handleWalletSelect = walletName => {
    setSelectedWallet(walletName);
    setDropdownOpen(false);
  };

  // Handle selecting info view
  const handleInfoClick = e => {
    e.stopPropagation(); // Prevent triggering the outside click handler
    setActiveView('info');
  };

  return (
    <Router>
      <div className={isDark ? 'dark' : ''}>
        <div className="App dark:bg-gray-800 bg-slate-50 dark:text-white text-black flex flex-col h-screen">
          {onboarded ? (
            <header className="App-header flex items-center justify-between px-4 py-3">
              <img src={iconUrl} alt="icon" width="34" height="34" />

              <div className="flex items-center mx-auto">
                <button
                  className={`text-xs px-3 py-1.5 rounded-md border border-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 mr-2 ${
                    activeView === 'info' ? 'bg-blue-600 text-white border-blue-600' : ''
                  }`}
                  onClick={handleInfoClick}>
                  Info
                </button>

                <div className="relative">
                  <button
                    className="flex items-center px-3 py-1.5 border border-gray-400 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={e => {
                      e.stopPropagation();
                      setDropdownOpen(!dropdownOpen);
                    }}>
                    <span className="font-semibold mr-2">{selectedWallet}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {dropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg">
                      {wallets.map(wallet => (
                        <button
                          key={wallet.id}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 ${
                            selectedWallet === wallet.name ? 'bg-gray-100 dark:bg-gray-600' : ''
                          }`}
                          onClick={() => handleWalletSelect(wallet.name)}>
                          {wallet.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => alert('Settings clicked')}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </header>
          ) : (
            <header className="App-header flex items-center justify-between px-4 py-3">
              <img src={iconUrl} alt="icon" width="34" height="34" />
              <span className="mx-auto text-lg font-semibold">Onboarding</span>
              <div className="scale-50 flex items-center">
                <ThemeToggle />
              </div>
            </header>
          )}

          <main className="p-4 flex-1 overflow-auto">
            {onboarded ? (
              // Custom content based on active view
              <>
                {activeView === 'assets' && (
                  <div className="flex flex-col items-center">
                    <h2 className="text-xl font-bold mb-4">{selectedWallet} - Assets</h2>
                    <p>Your crypto assets will appear here.</p>
                    {/* You would add your actual assets display here */}
                  </div>
                )}

                {activeView === 'history' && (
                  <div className="flex flex-col items-center">
                    <h2 className="text-xl font-bold mb-4">{selectedWallet} - Transaction History</h2>
                    <p>Your transaction history will appear here.</p>
                    {/* You would add your actual transaction history here */}
                  </div>
                )}

                {activeView === 'info' && (
                  <div className="flex flex-col items-center">
                    <h2 className="text-xl font-bold mb-4">{selectedWallet} - Wallet Info</h2>
                    <p>Your wallet information and details will appear here.</p>
                    {/* You would add your actual wallet info here */}
                  </div>
                )}
              </>
            ) : (
              // Onboarding routes
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
            )}
          </main>

          <footer className="App-footer p-4 border-t flex justify-center space-x-4">
            <button
              className={`px-6 py-2 rounded-md transition ${
                activeView === 'assets' && activeView !== 'info'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              onClick={() => setActiveView('assets')}>
              Assets
            </button>
            <button
              className={`px-6 py-2 rounded-md transition ${
                activeView === 'history' && activeView !== 'info'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              onClick={() => setActiveView('history')}>
              History
            </button>
          </footer>
        </div>
      </div>
    </Router>
  );
}

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

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Cannot find #app-container');
  }

  const root = createRoot(appContainer);
  root.render(<Root />);
}

init();
