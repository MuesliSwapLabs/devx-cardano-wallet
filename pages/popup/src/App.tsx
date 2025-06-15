// popup/src/App.tsx
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStorage, exampleThemeStorage, walletsStorage, appStateStorage } from '@extension/storage';

// Layouts
import OnboardingLayout from './layouts/OnboardingLayout';
import MainLayout from './layouts/MainLayout';
import SubPageLayout from './layouts/SubPageLayout';
import WalletActionLayout from './layouts/WalletActionLayout';

// Main View
import WalletView from './views/WalletView';

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
import WalletSettings from './pages/wallet-actions/WalletSettings'; // Import the new page

// Settings Page
import Settings from './pages/Settings';

function App() {
  const theme = useStorage(exampleThemeStorage);
  const wallets = useStorage(walletsStorage);
  const appState = useStorage(appStateStorage);

  const isDark = theme === 'dark';
  const hasWallets = wallets && wallets.length > 0;
  const isOnboarded = appState?.onboarded && hasWallets;

  const defaultWalletId = wallets?.[0]?.id || 'no-wallets';

  return (
    <Router>
      <div className={isDark ? 'dark' : ''}>
        <div className="App dark:bg-gray-800 bg-slate-50 dark:text-white text-black flex flex-col h-screen">
          <Routes>
            <Route path="/onboarding" element={<OnboardingLayout />}>
              <Route index element={<Welcome />} />
              <Route path="legal" element={<Legal />} />
            </Route>

            <Route element={<WalletActionLayout />}>
              <Route path="/add-wallet" element={<AddWallet />} />
              <Route path="/create-new-wallet" element={<CreateNew />} />
              <Route path="/create-new-wallet-success" element={<CreateSuccess />} />
              <Route path="/spoof-wallet" element={<Spoof />} />
              <Route path="/spoof-wallet-success" element={<SpoofSuccess />} />
              <Route path="/import-wallet-from-seed-phrase" element={<ImportSeed />} />
              <Route path="/import-wallet-from-seed-phrase-success" element={<ImportSuccess />} />
            </Route>

            <Route path="/wallet/:walletId/:view" element={<MainLayout />}>
              <Route index element={<WalletView />} />
            </Route>

            <Route element={<SubPageLayout />}>
              <Route path="/settings" element={<Settings />} />
              <Route path="/wallet-settings/:walletId" element={<WalletSettings />} />
            </Route>

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
