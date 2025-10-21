import { createHashRouter, RouterProvider, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useStorage, devxSettings, devxData } from '@extension/storage';
import { Suspense, useEffect } from 'react';

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

// Wallet loader function - fetches a specific wallet by ID
async function walletLoader({ params }: any) {
  try {
    const wallet = await devxData.getWallet(params.walletId);
    if (!wallet) {
      throw new Response('Wallet not found', { status: 404 });
    }
    return { wallet };
  } catch (error) {
    if (error instanceof Response) {
      throw error; // Re-throw Response errors (like 404)
    }
    console.error('Failed to fetch wallet:', error);
    throw new Response('Failed to load wallet', { status: 500 });
  }
}

// Assets loader function - fetches cached assets (non-blocking)
async function assetsLoader({ params }: any) {
  try {
    const wallet = await devxData.getWallet(params.walletId);
    const assets = await devxData.getWalletAssets(params.walletId);
    return {
      assets,
      lastFetchedBlockAssets: wallet.lastFetchedBlockAssets || 0,
    };
  } catch (error) {
    console.error('Failed to fetch assets:', error);
    throw new Response('Failed to load assets', { status: 500 });
  }
}

// Transactions loader function - fetches cached transactions (non-blocking)
async function transactionsLoader({ params }: any) {
  try {
    const wallet = await devxData.getWallet(params.walletId);
    const transactions = await devxData.getWalletTransactions(params.walletId);
    return {
      transactions,
      lastFetchedBlockTransactions: wallet?.lastFetchedBlockTransactions || 0,
    };
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw new Response('Failed to load transactions', { status: 500 });
  }
}

// UTXOs loader function - fetches cached UTXOs (non-blocking)
async function utxosLoader({ params }: any) {
  try {
    const wallet = await devxData.getWallet(params.walletId);
    const utxos = await devxData.getWalletUTXOs(params.walletId);
    return {
      utxos,
      lastFetchedBlockUtxos: wallet?.lastFetchedBlockUtxos || 0,
    };
  } catch (error) {
    console.error('Failed to fetch UTXOs:', error);
    throw new Response('Failed to load UTXOs', { status: 500 });
  }
}

// Layout component that wraps everything
function AppLayout() {
  const settings = useStorage(devxSettings);
  const isDark = settings?.theme === 'dark';

  // Check if we have wallets by checking if activeWalletId exists
  const hasWallets = settings?.activeWalletId !== null && settings?.activeWalletId !== undefined;

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
  const settings = useStorage(devxSettings);

  // Check if we have wallets by checking if activeWalletId exists
  const hasWallets = settings?.activeWalletId !== null && settings?.activeWalletId !== undefined;
  const defaultWalletId = settings?.activeWalletId || 'no-wallets';

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
    id: 'root',
    element: <AppLayout />,
    HydrateFallback: () => <div className="flex h-full items-center justify-center">Loading...</div>, // Satisfies v7's initial "hydration" phase
    children: [
      { index: true, element: <FallbackRedirect /> },
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
        id: 'wallet',
        element: <MainLayout />,
        loader: walletLoader,
        children: [
          { path: 'assets', element: <AssetsView />, loader: assetsLoader },
          { path: 'transactions', element: <TransactionsView />, loader: transactionsLoader },
          { path: 'utxos', element: <UTXOsViewWrapper />, loader: utxosLoader },
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
