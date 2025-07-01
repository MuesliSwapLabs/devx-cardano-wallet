import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useStorage, settingsStorage, walletsStorage } from '@extension/storage';
import type { Wallet } from '@extension/shared';

/**
 * SubPageLayout is a generic "shell" for secondary pages.
 * It now intelligently displays the wallet name as the title when on a wallet settings page.
 */
function SubPageLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { walletId } = useParams(); // Get the walletId from the URL

  // Use the new unified settings storage
  const settings = useStorage(settingsStorage);
  const walletsData = useStorage(walletsStorage); // Get all wallets from storage

  const wallets = walletsData?.wallets || [];
  // The theme is now a property of the settings object
  const isDark = settings?.theme === 'dark';

  // A helper to generate the title dynamically.
  const getTitle = () => {
    // If we are on a wallet-settings page and have the wallet data, use the wallet's name.
    if (walletId && wallets) {
      const currentWallet = wallets.find((w: Wallet) => w.id === walletId);
      if (currentWallet) {
        return currentWallet.name;
      }
    }

    // Fallback logic for other pages like /settings
    const path = location.pathname.split('/').pop() || 'Page';
    const titleMap: { [key: string]: string } = {
      'add-wallet': 'Add New Wallet',
      'create-new-wallet': 'Create Wallet',
      'create-new-wallet-success': 'Create Wallet',
      'spoof-wallet': 'Spoof Wallet',
      'spoof-wallet-success': 'Spoof Wallet',
      'import-wallet-from-seed-phrase': 'Import Wallet',
      'import-wallet-from-seed-phrase-success': 'Import Wallet',
      settings: 'Settings',
    };

    return titleMap[path] || path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
  };

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 relative border-b border-gray-300 dark:border-gray-600">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="absolute left-1/2 transform -translate-x-1/2 text-xl font-semibold">{getTitle()}</span>

        <div className="w-8"></div>
      </header>

      <main className="p-4 flex-1 overflow-auto">
        <Outlet />
      </main>
    </>
  );
}

export default SubPageLayout;
