// popup/src/layouts/MainLayout.tsx
import { useState } from 'react';
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useStorage, settingsStorage, walletsStorage } from '@extension/storage';
import WalletDropdown from '../components/WalletDropdown';
import { PrimaryButton, SecondaryButton } from '@src/components/buttons';
import type { Wallet } from '@extension/shared';

function MainLayout() {
  const { walletId, view = 'assets' } = useParams();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const settings = useStorage(settingsStorage);
  const wallets = useStorage(walletsStorage);

  const currentWallet = wallets?.find((w: Wallet) => w.id === walletId);
  const isDark = settings?.theme === 'dark';
  const iconUrl = isDark ? chrome.runtime.getURL('icon-dark.svg') : chrome.runtime.getURL('icon-light.svg');

  const handleWalletSelect = (newWalletId: string) => navigate(`/wallet/${newWalletId}/${view}`);

  return (
    <>
      <header className="flex items-center justify-between px-4 pt-3 pb-2">
        <img src={iconUrl} alt="icon" width="34" height="34" />
        <div className="flex items-center mx-auto">
          <WalletDropdown currentWalletId={walletId} onSelectWallet={handleWalletSelect} />
        </div>
        <Link
          to="/settings"
          className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
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
        </Link>
      </header>
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <div className="relative border-b border-gray-300 dark:border-gray-600 mt-1 mb-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 px-2 h-6 bg-slate-50 dark:bg-gray-800 flex items-center justify-center focus:outline-none text-gray-400 dark:text-gray-500"
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
          className={`transition-all duration-300 ease-in-out grid ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="p-4 border-b border-gray-300 dark:border-gray-600">
              <div className="text-center mb-3">
                <p className="text-xs text-gray-500">Current Balance</p>
                <p className="text-2xl font-bold">
                  {(parseInt(currentWallet?.balance || '0') / 1_000_000).toLocaleString()} ₳
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                <PrimaryButton className="flex-1">Send</PrimaryButton>
                <SecondaryButton className="flex-1">Receive</SecondaryButton>
              </div>
            </div>
          </div>
        </div>
        <main className="p-4 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <footer className="p-4 border-t border-gray-300 dark:border-gray-600 flex justify-center space-x-4">
        <Link
          to={`/wallet/${walletId}/assets`}
          className={`px-6 py-2 rounded-md transition ${view === 'assets' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
          Assets
        </Link>
        <Link
          to={`/wallet/${walletId}/history`}
          className={`px-6 py-2 rounded-md transition ${view === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
          History
        </Link>
      </footer>
    </>
  );
}

export default MainLayout;
