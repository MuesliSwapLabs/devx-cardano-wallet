// popup/src/App.tsx
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStorage, settingsStorage, walletsStorage } from '@extension/storage';
import { useEffect } from 'react';

// Layouts
import MainLayout from './layouts/MainLayout';
import OnboardingLayout from './layouts/OnboardingLayout';
import SubPageLayout from './layouts/SubPageLayout';
import WalletActionLayout from './layouts/WalletActionLayout';

// Views
import WalletView from './wallet/WalletView';
import Settings from './Settings';

// Onboarding Pages
import Welcome from './onboarding/Welcome';
import Legal from './onboarding/Legal';

// Wallet Action Pages
import AddWallet from './wallet-actions/NewWalletView';
import CreateNew from './wallet-actions/CreateNew';
import CreateSuccess from './wallet-actions/CreateSuccess';
import ImportSeed from './wallet-actions/ImportSeed';
import ImportSuccess from './wallet-actions/ImportSuccess';
import Spoof from './wallet-actions/Spoof';
import SpoofSuccess from './wallet-actions/SpoofSuccess';
import WalletSettings from './wallet-actions/WalletSettings';

function App() {
  const settings = useStorage(settingsStorage);
  const walletsData = useStorage(walletsStorage);

  const isDark = settings?.theme === 'dark';
  const wallets = walletsData?.wallets || [];
  const hasWallets = wallets.length > 0;
  const isOnboarded = settings?.onboarded && hasWallets;

  // Debug logging to help track onboarding issues
  useEffect(() => {
    console.log('App.tsx state:', {
      onboarded: settings?.onboarded,
      hasWallets,
      walletsCount: wallets.length,
      isOnboarded,
      activeWalletId: settings?.activeWalletId,
    });
  }, [settings?.onboarded, hasWallets, wallets.length, isOnboarded, settings?.activeWalletId]);

  // Auto-set activeWalletId if it's null but we have wallets
  useEffect(() => {
    if (hasWallets && !settings?.activeWalletId) {
      settingsStorage.setActiveWalletId(wallets[0].id);
    }
  }, [hasWallets, settings?.activeWalletId, wallets]);

  // Use the active wallet from settings, or fall back to the first wallet
  const activeWalletId = settings?.activeWalletId;
  const defaultWalletId = (() => {
    // If we have an activeWalletId and it exists in wallets, use it
    if (activeWalletId && wallets.find(w => w.id === activeWalletId)) {
      return activeWalletId;
    }
    // Otherwise, use the first available wallet
    if (wallets.length > 0) {
      return wallets[0].id;
    }
    // No wallets available
    return 'no-wallets';
  })();

  return (
    <Router>
      <div className={isDark ? 'dark' : ''}>
        <div className="App dark:bg-gray-800 bg-slate-50 dark:text-white text-black flex flex-col h-screen">
          <Routes>
            {/* Initial Onboarding Flow */}
            <Route path="/onboarding" element={<OnboardingLayout />}>
              <Route index element={<Welcome />} />
              <Route path="legal" element={<Legal />} />
            </Route>

            {/* Wallet Action Flows */}
            <Route element={<WalletActionLayout />}>
              <Route path="/add-wallet" element={<AddWallet />} />
              <Route path="/create-new-wallet" element={<CreateNew />} />
              <Route path="/create-new-wallet-success" element={<CreateSuccess />} />
              <Route path="/import-wallet-from-seed-phrase" element={<ImportSeed />} />
              <Route path="/import-wallet-from-seed-phrase-success" element={<ImportSuccess />} />
              <Route path="/spoof-wallet" element={<Spoof />} />
              <Route path="/spoof-wallet-success" element={<SpoofSuccess />} />
            </Route>

            {/* Sub-Pages (Settings) */}
            <Route element={<SubPageLayout />}>
              <Route path="/settings" element={<Settings />} />
              <Route path="/wallet-settings/:walletId" element={<WalletSettings />} />
            </Route>

            {/* Main Application */}
            <Route path="/wallet/:walletId/:view" element={<MainLayout />}>
              <Route index element={<WalletView />} />
            </Route>

            {/* Fallback Redirect */}
            <Route
              path="*"
              element={<Navigate to={isOnboarded ? `/wallet/${defaultWalletId}/assets` : '/onboarding'} replace />}
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
