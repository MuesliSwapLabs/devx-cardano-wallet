// popup/src/App.tsx
import {
  createHashRouter,
  RouterProvider,
  Navigate,
  useNavigate,
  useLocation,
  useLoaderData,
  Outlet,
} from 'react-router-dom';
import { useStorage, devxSettings, devxData } from '@extension/storage';
import { Suspense, useEffect, useState } from 'react';
import type { Wallet } from '@extension/shared';

// Layouts
import MainLayout from './layouts/MainLayout';
import OnboardingLayout from './layouts/OnboardingLayout';
import SubPageLayout from './layouts/SubPageLayout';
import WalletActionLayout from './layouts/WalletActionLayout';

// Views
import AssetsView from './wallet/AssetsView';
import TransactionsView from './wallet/TransactionsView';
import UTXOsViewWrapper from './wallet/UTXOsViewWrapper';
import UTXODetail from './wallet/UTXODetail';
import Settings from './Settings';
import SpoofedWalletInfo from './info/SpoofedWalletInfo';
import DAppPermission from './cip30/DAppPermission';
import NoWallets from './components/NoWallets';

// Onboarding Pages
import Welcome from './onboarding/Welcome';
import Legal from './onboarding/Legal';

// Wallet Action Pages
import AddWallet from './wallet-actions/NewWalletView';
import CreateSuccess from './wallet-actions/CreateSuccess';
import ImportSuccess from './wallet-actions/ImportSuccess';
import SpoofSuccess from './wallet-actions/SpoofSuccess';
import WalletSettings from './wallet-actions/WalletSettings';

// Split Component Imports for Clean Routing
import CreateWalletForm from './wallet-actions/CreateWalletForm';
import CreateWalletApiKey from './wallet-actions/CreateWalletApiKey';
import ImportSelectWords from './wallet-actions/ImportSelectWords';
import ImportEnterPhrase from './wallet-actions/ImportEnterPhrase';
import ImportWalletDetails from './wallet-actions/ImportWalletDetails';
import ImportWalletApiKey from './wallet-actions/ImportWalletApiKey';
import SpoofWalletForm from './wallet-actions/SpoofWalletForm';
import SpoofWalletApiKey from './wallet-actions/SpoofWalletApiKey';

// Component to handle navigation messages (must be inside Router)
function NavigationHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'NAVIGATE_TO_PERMISSION') {
        const { origin, tabId } = message.payload;
        navigate(`/dapp-permission?origin=${encodeURIComponent(origin)}&tabId=${tabId}`);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [navigate]);

  return null;
}

// Component to handle URL tracking for onboarding resumption
function OnboardingTracker({ hasWallets }: { hasWallets: boolean }) {
  const location = useLocation();

  useEffect(() => {
    // Save URL during onboarding flows (when no wallets exist)
    if (!hasWallets) {
      const isOnboardingRoute =
        location.pathname.includes('onboarding') ||
        location.pathname.includes('add-wallet') ||
        location.pathname.includes('create-') ||
        location.pathname.includes('import-') ||
        location.pathname.includes('spoof-');

      if (isOnboardingRoute) {
        devxSettings.setLastOnboardingUrl(location.pathname + location.search);
      }
    }
  }, [location, hasWallets]);

  return null;
}

// Loader function to fetch wallets
async function walletsLoader() {
  try {
    const wallets = await devxData.getWallets();
    const settings = await devxSettings.get();

    // Auto-set activeWalletId if it's null but we have wallets
    if (wallets.length > 0 && !settings?.activeWalletId) {
      await devxSettings.setActiveWalletId(wallets[0].id);
    }

    return { wallets, settings };
  } catch (error) {
    console.error('Failed to fetch wallets:', error);
    return { wallets: [], settings: null };
  }
}

// Layout component that wraps everything
function AppLayout() {
  const settings = useStorage(devxSettings);
  const isDark = settings?.theme === 'dark';
  const [wallets, setWallets] = useState<Wallet[]>([]);

  // Fetch wallets for OnboardingTracker
  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const walletsFromDB = await devxData.getWallets();
        setWallets(walletsFromDB);
      } catch (error) {
        console.error('Failed to fetch wallets for layout:', error);
        setWallets([]);
      }
    };
    fetchWallets();
  }, []);

  const hasWallets = wallets.length > 0;

  return (
    <>
      <NavigationHandler />
      <OnboardingTracker hasWallets={hasWallets} />
      <div className={`${isDark ? 'dark' : ''} h-full`}>
        <div className="App flex h-full flex-col bg-slate-50 text-black dark:bg-gray-800 dark:text-white">
          <Suspense fallback={<div className="flex h-full items-center justify-center">Loading...</div>}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </>
  );
}

// Component that handles the fallback redirect logic
function FallbackRedirect() {
  const { wallets, settings } = useLoaderData() as { wallets: Wallet[]; settings: any };
  const hasWallets = wallets.length > 0;

  // Get active wallet ID
  const defaultWalletId = (() => {
    const activeWalletId = settings?.activeWalletId;
    if (activeWalletId && wallets.find(w => w.id === activeWalletId)) {
      return activeWalletId;
    }
    if (wallets.length > 0) {
      return wallets[0].id;
    }
    return 'no-wallets';
  })();

  return (
    <Navigate
      to={hasWallets ? `/wallet/${defaultWalletId}/assets` : settings?.lastOnboardingUrl || '/onboarding'}
      replace
    />
  );
}

const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    HydrateFallback: () => <div className="flex h-full items-center justify-center">Loading...</div>, // Satisfies v7's initial "hydration" phase
    children: [
      { index: true, loader: walletsLoader, element: <FallbackRedirect /> },
      {
        path: 'onboarding',
        element: <OnboardingLayout />,
        children: [
          { index: true, element: <Welcome /> },
          { path: 'legal', element: <Legal /> },
        ],
      },
      {
        path: '',
        element: <WalletActionLayout />,
        children: [
          { path: 'add-wallet', element: <AddWallet /> },
          { path: 'create-new-wallet', element: <CreateWalletForm /> },
          { path: 'create-new-wallet/api-key', element: <CreateWalletApiKey /> },
          { path: 'create-new-wallet/success', element: <CreateSuccess /> },
          { path: 'import-wallet', element: <ImportSelectWords /> },
          { path: 'import-wallet/enter/:wordCount', element: <ImportEnterPhrase /> },
          { path: 'import-wallet/details', element: <ImportWalletDetails /> },
          { path: 'import-wallet/api-key', element: <ImportWalletApiKey /> },
          { path: 'import-wallet/success', element: <ImportSuccess /> },
          { path: 'spoof-wallet', element: <SpoofWalletForm /> },
          { path: 'spoof-wallet/api-key', element: <SpoofWalletApiKey /> },
          { path: 'spoof-wallet/success', element: <SpoofSuccess /> },
        ],
      },
      {
        path: '',
        element: <SubPageLayout />,
        children: [
          { path: 'settings', element: <Settings /> },
          { path: 'wallet-settings/:walletId', element: <WalletSettings /> },
          { path: 'spoofed-info', element: <SpoofedWalletInfo /> },
          { path: 'no-wallets', element: <NoWallets /> },
          { path: 'wallet/:walletId/utxo/:txHash/:outputIndex', element: <UTXODetail /> },
        ],
      },
      { path: 'dapp-permission', element: <DAppPermission /> },
      {
        path: 'wallet/:walletId',
        element: <MainLayout />,
        children: [
          { path: 'assets', element: <AssetsView /> },
          { path: 'transactions', element: <TransactionsView /> },
          { path: 'utxos', element: <UTXOsViewWrapper /> },
          { index: true, element: <Navigate to="assets" replace /> },
        ],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
