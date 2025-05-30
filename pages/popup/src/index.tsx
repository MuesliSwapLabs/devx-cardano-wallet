// Complete revised code for index.tsx
import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Navigate, useParams, useNavigate, Link, Outlet } from 'react-router-dom';
import '@src/index.css';
import { useStorage } from '@extension/shared';
import { exampleThemeStorage, appStateStorage } from '@extension/storage';

import ThemeToggle from './components/themeToggle';
import Popup from './wallet';
import Onboarding from './onboarding';
import AddWallet from './onboarding/pages/addWallet';
import LegalAndAnalytics from './onboarding/pages/legalAndAnalytics';
import CreateNewWallet from './onboarding/pages/createNewWallet';
import CreateNewWalletSuccess from './onboarding/pages/createNewWalletSuccess';
import SpoofWallet from './onboarding/pages/spoofWallet';
import SpoofWalletSuccess from './onboarding/pages/spoofWalletSuccess';
import ImportWalletFromSeedPhrase from './onboarding/pages/importWalletFromSeedPhrase';
import ImportWalletFromSeedPhraseSuccess from './onboarding/pages/importWalletFromSeedPhraseSuccess';

function OnboardingApp() {
  const theme = useStorage(exampleThemeStorage);
  const isDark = theme === 'dark';
  const iconUrl = isDark ? chrome.runtime.getURL('icon-dark.svg') : chrome.runtime.getURL('icon-light.svg');

  return (
    <>
      {/* Hardcoded Onboarding Header */}
      <header className="App-header flex items-center justify-between px-4 py-3 relative">
        <img src={iconUrl} alt="icon" width="34" height="34" />
        <span className="absolute left-1/2 transform -translate-x-1/2 text-2xl font-semibold">Onboarding</span>
        <ThemeToggle />
      </header>

      {/* Onboarding Routes */}
      <main className="p-4 flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
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
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </main>

      {/* Hardcoded Onboarding Footer with progress indicator */}
      <footer className="App-footer p-4 border-t text-center">
        <div className="flex justify-center items-center">
          <div className="text-sm">Onboarding Progress</div>
          <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full ml-3">
            <div className="h-2 bg-blue-500 rounded-full" style={{ width: '50%' }}></div>
          </div>
        </div>
      </footer>
    </>
  );
}

function WalletDropdown({ currentWalletId, onSelectWallet }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Sample wallet list
  const wallets = [
    { id: 'my-wallet', name: 'My Wallet' },
    { id: 'trading-wallet', name: 'Trading Wallet' },
    { id: 'savings-wallet', name: 'Savings Wallet' },
    { id: 'defi-wallet', name: 'DeFi Wallet' },
  ];

  // Find current wallet from the currentWalletId parameter
  const currentWallet = wallets.find(w => w.id === currentWalletId) || wallets[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    if (dropdownOpen) {
      const handleClickOutside = () => setDropdownOpen(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  // Handle wallet selection
  const handleWalletSelect = walletId => {
    onSelectWallet(walletId);
    setDropdownOpen(false);
  };

  return (
    <div className="relative">
      <button
        className="flex items-center px-3 py-1.5 border border-gray-400 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
        onClick={e => {
          e.stopPropagation();
          setDropdownOpen(!dropdownOpen);
        }}>
        <span className="font-semibold mr-2">{currentWallet.name}</span>
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
                currentWalletId === wallet.id ? 'bg-gray-100 dark:bg-gray-600' : ''
              }`}
              onClick={() => handleWalletSelect(wallet.id)}>
              {wallet.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// MainApp Layout component - this wraps all the main app routes and provides the UI shell
function MainAppLayout() {
  const theme = useStorage(exampleThemeStorage);
  const isDark = theme === 'dark';
  const iconUrl = isDark ? chrome.runtime.getURL('icon-dark.svg') : chrome.runtime.getURL('icon-light.svg');
  const navigate = useNavigate();
  const { walletId = 'my-wallet', view = 'assets' } = useParams();

  // Handle wallet selection - navigate to the same view but with new wallet
  const handleWalletSelect = newWalletId => {
    navigate(`/wallet/${newWalletId}/${view}`);
  };

  return (
    <>
      {/* Main App Header with wallet selector */}
      <header className="App-header flex items-center justify-between px-4 py-3">
        <img src={iconUrl} alt="icon" width="34" height="34" />

        <div className="flex items-center mx-auto">
          <Link
            to={`/wallet/${walletId}/info`}
            className={`text-xs px-3 py-1.5 rounded-md border border-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 mr-2 ${
              view === 'info' ? 'bg-blue-600 text-white border-blue-600' : ''
            }`}>
            Info
          </Link>

          <WalletDropdown currentWalletId={walletId} onSelectWallet={handleWalletSelect} />
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      {/* Main Content Area - renders the child route components */}
      <main className="p-4 flex-1 overflow-auto">
        <Outlet /> {/* This renders the nested route components */}
      </main>

      {/* Main App Footer with navigation tabs */}
      <footer className="App-footer p-4 border-t flex justify-center space-x-4">
        <Link
          to={`/wallet/${walletId}/assets`}
          className={`px-6 py-2 rounded-md transition ${
            view === 'assets'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}>
          Assets
        </Link>
        <Link
          to={`/wallet/${walletId}/history`}
          className={`px-6 py-2 rounded-md transition ${
            view === 'history'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}>
          History
        </Link>
      </footer>
    </>
  );
}

// Root component that handles conditional rendering between onboarding and main app
function Root() {
  const theme = useStorage(exampleThemeStorage);
  const isDark = theme === 'dark';

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

  return (
    <Router>
      <div className={isDark ? 'dark' : ''}>
        <div className="App dark:bg-gray-800 bg-slate-50 dark:text-white text-black flex flex-col h-screen">
          {onboarded ? (
            <Routes>
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/wallet/my-wallet/assets" replace />} />

              {/* Main app routes with layout */}
              <Route path="/wallet/:walletId/:view" element={<MainAppLayout />}>
                <Route index element={<Popup />} />
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/wallet/my-wallet/assets" replace />} />
            </Routes>
          ) : (
            <OnboardingApp />
          )}
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
