// popup/src/App.tsx
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStorage, settingsStorage, walletsStorage } from '@extension/storage';

// Layouts
import MainLayout from './layouts/MainLayout';
import OnboardingLayout from './layouts/OnboardingLayout';
import SubPageLayout from './layouts/SubPageLayout';
import WalletActionLayout from './layouts/WalletActionLayout';

// Views
import WalletView from './views/WalletView';
import Settings from './pages/Settings';

// Onboarding Pages
import Welcome from './pages/onboarding/Welcome';
import Legal from './pages/onboarding/Legal';

// Wallet Action Pages
import AddWallet from './pages/wallet-actions/NewWalletView';
import CreateNew from './pages/wallet-actions/CreateNew';
import CreateSuccess from './pages/wallet-actions/CreateSuccess';
import ImportSeed from './pages/wallet-actions/ImportSeed';
import ImportSuccess from './pages/wallet-actions/ImportSuccess';
import Spoof from './pages/wallet-actions/Spoof';
import SpoofSuccess from './pages/wallet-actions/SpoofSuccess';
import WalletSettings from './pages/wallet-actions/WalletSettings';

function App() {
  const settings = useStorage(settingsStorage);
  const wallets = useStorage(walletsStorage);

  const isDark = settings?.theme === 'dark';
  const hasWallets = wallets && wallets.length > 0;
  const isOnboarded = settings?.onboarded && hasWallets;
  const defaultWalletId = wallets?.[0]?.id || 'no-wallets';

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
