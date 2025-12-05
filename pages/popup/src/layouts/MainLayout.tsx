import { useState } from 'react';
import { Link, Outlet, useNavigate, useParams, useLocation, useLoaderData } from 'react-router-dom';
import { useStorage, devxSettings } from '@extension/storage';
import WalletDropdown from '../components/WalletDropdown';
import { useWalletSync } from '@src/hooks/useWalletSync';
import type { Wallet } from '@extension/shared';

function MainLayout() {
  const { walletId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { wallet: currentWallet } = useLoaderData() as { wallet: Wallet };

  // Get current view from pathname
  const view = location.pathname.split('/').pop() || 'assets';
  const [isExpanded, setIsExpanded] = useState(false);
  const settings = useStorage(devxSettings);
  const isDark = settings?.theme === 'dark';
  const iconUrl = isDark ? chrome.runtime.getURL('icon-dark.svg') : chrome.runtime.getURL('icon-light.svg');

  // Centralized wallet sync - just need isSyncing for refresh button state
  const { isSyncing, triggerSync } = useWalletSync(walletId);

  const handleWalletSelect = async (newWalletId: string) => {
    // Update the active wallet in storage
    await devxSettings.setActiveWalletId(newWalletId);
    // Always navigate to assets tab when switching wallets to ensure fresh data
    navigate(`/wallet/${newWalletId}/assets`);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="relative flex items-center justify-between px-4 pb-2 pt-3">
        <img src={iconUrl} alt="icon" width="34" height="34" />
        <div className="absolute left-1/2 -translate-x-1/2">
          <WalletDropdown currentWalletId={walletId} onSelectWallet={handleWalletSelect} disabled={isSyncing} />
        </div>
        <div className="flex items-center">
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="mr-2 flex size-8 items-center justify-center rounded-full hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-700"
            title={isSyncing ? 'Syncing...' : 'Refresh wallet data'}>
            <svg
              className={`size-4 ${isSyncing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <Link
            to="/settings"
            className="flex size-8 items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-5"
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
          </Link>
        </div>
      </header>
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="relative my-1 border-b border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute bottom-0 left-1/2 flex h-6 -translate-x-1/2 translate-y-1/2 items-center justify-center bg-slate-50 px-2 text-gray-400 focus:outline-none dark:bg-gray-800 dark:text-gray-500"
            aria-expanded={isExpanded}>
            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M2 2L8 6L14 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 6L8 10L14 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
        </div>
        <div
          className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="border-b border-gray-300 p-4 dark:border-gray-600">
              <div className="mb-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-xs text-gray-500">Current Balance</p>
                </div>
                <p className="text-2xl font-bold">
                  {(parseInt(currentWallet?.balance || '0') / 1_000_000).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}{' '}
                  ₳
                </p>
              </div>
              <div className="text-center">
                <p className="mb-1 text-sm text-gray-500">DevX Wallet doesn't support transactions.</p>
                <Link to="/about-devx" className="text-xs text-blue-500 underline hover:text-blue-600">
                  Learn more
                </Link>
              </div>
            </div>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto px-4 pb-4">
          <Outlet />
        </main>
      </div>
      <footer className="flex justify-center space-x-4 border-t border-gray-300 p-4 dark:border-gray-600">
        <Link
          to={`/wallet/${walletId}/assets`}
          className={`rounded-md px-6 py-2 transition ${view === 'assets' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>
          Assets
        </Link>
        <Link
          to={`/wallet/${walletId}/transactions`}
          className={`rounded-md px-4 py-2 text-sm transition ${view === 'transactions' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>
          Transactions
        </Link>
        <Link
          to={`/wallet/${walletId}/utxos`}
          className={`rounded-md px-6 py-2 transition ${view === 'utxos' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>
          UTXOs
        </Link>
      </footer>
    </div>
  );
}

export default MainLayout;
