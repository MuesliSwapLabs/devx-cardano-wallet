// popup/src/components/WalletDropdown.tsx
import { useState, useEffect } from 'react';
import { useStorage, walletsStorage } from '@extension/storage';
import { Link, useNavigate } from 'react-router-dom';

interface WalletDropdownProps {
  currentWalletId: string | undefined;
  onSelectWallet: (walletId: string) => void;
}

function WalletDropdown({ currentWalletId, onSelectWallet }: WalletDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wallets = useStorage(walletsStorage);
  const navigate = useNavigate();

  const currentWallet = wallets?.find(w => w.id === currentWalletId) || wallets?.[0];

  useEffect(() => {
    if (dropdownOpen) {
      const handleClickOutside = () => setDropdownOpen(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleWalletSelect = (walletId: string) => {
    onSelectWallet(walletId);
    setDropdownOpen(false);
  };

  const handleSettingsClick = (e: React.MouseEvent, walletId: string) => {
    e.stopPropagation(); // Prevent dropdown from closing immediately
    setDropdownOpen(false); // Manually close dropdown
    navigate(`/wallet-settings/${walletId}`);
  };

  if (!wallets || wallets.length === 0) {
    return (
      <Link
        to="/add-wallet"
        className="px-3 py-1.5 border border-gray-400 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
        <span className="font-semibold">Add First Wallet</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        className="flex items-center justify-between w-40 px-2 py-1 rounded-md bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        onClick={e => {
          e.stopPropagation();
          setDropdownOpen(!dropdownOpen);
        }}>
        <div className="flex-grow text-center">
          <span className="font-semibold text-lg truncate">{currentWallet?.name || 'Select Wallet'}</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg overflow-hidden">
          {wallets.map(wallet => (
            <div
              key={wallet.id}
              className={`flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 px-2 ${currentWalletId === wallet.id ? 'bg-gray-200 dark:bg-gray-700' : ''}`}>
              <button className="flex-grow text-center py-2" onClick={() => handleWalletSelect(wallet.id)}>
                {wallet.name}
              </button>
              <button onClick={e => handleSettingsClick(e, wallet.id)} className="p-2 cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01"
                  />
                </svg>
              </button>
            </div>
          ))}
          <div className="border-t border-gray-200 dark:border-gray-600"></div>
          <Link
            to="/add-wallet"
            className="block w-full text-center px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => setDropdownOpen(false)}>
            Add New Wallet
          </Link>
        </div>
      )}
    </div>
  );
}

export default WalletDropdown;
