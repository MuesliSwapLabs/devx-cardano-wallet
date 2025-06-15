// popup/src/views/WalletView.tsx
import { PrimaryButton } from '@src/components/buttons';
import { useStorage, appStateStorage, walletsStorage } from '@extension/storage';
import { useParams } from 'react-router-dom';
import type { Wallet } from '@extension/shared';

/**
 * WalletView is the main content area for a logged-in user.
 */
function WalletView() {
  const { walletId, view = 'assets' } = useParams();
  const wallets = useStorage(walletsStorage);

  const currentWallet = wallets?.find((w: Wallet) => w.id === walletId);
  const walletName = currentWallet?.name || 'Wallet';

  const handleReset = () => {
    walletsStorage.set([]);
    appStateStorage.set({ onboarded: false });
  };

  if (view === 'assets') {
    return (
      <div className="flex flex-col items-center">
        <h2 className="text-xl font-bold mb-4">{walletName} - Assets</h2>
        <p>Balance: {currentWallet?.balance || '0'} ADA</p>
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div className="flex flex-col items-center">
        <h2 className="text-xl font-bold mb-4">{walletName} - Transaction History</h2>
        <p>Your transaction history will appear here.</p>
      </div>
    );
  }

  if (view === 'info') {
    return (
      <div className="flex flex-col items-center">
        <h2 className="text-xl font-bold mb-4">{walletName} - Wallet Info</h2>
        <p className="text-xs break-all">Address: {currentWallet?.address}</p>
        <p className="mt-4">
          Reset: <PrimaryButton onClick={handleReset}>Reset All Data</PrimaryButton>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-bold mb-4">Unknown View</h2>
      <p>Please select a valid view.</p>
    </div>
  );
}

export default WalletView;
