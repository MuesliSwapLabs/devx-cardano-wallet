import { PrimaryButton } from '@src/components/buttons';
import React from 'react';
import { withErrorBoundary, withSuspense } from '@extension/shared';
// Import the new unified settingsStorage and walletsStorage
import { useStorage, settingsStorage, walletsStorage } from '@extension/storage';
import { useParams } from 'react-router-dom';
import type { Wallet } from '@extension/shared';

function Popup() {
  // Get the list of wallets from storage to find the current one
  const wallets = useStorage(walletsStorage);

  // Get params from URL
  const { walletId = 'my-wallet', view = 'assets' } = useParams();

  // Find the current wallet from the real data in storage
  const currentWallet = wallets?.find((w: Wallet) => w.id === walletId);
  const walletName = currentWallet?.name || 'Wallet';

  const handleReset = () => {
    // Use the new settings storage to reset the app
    walletsStorage.set([]);
    settingsStorage.unmarkOnboarded();
  };

  // Render different content based on view
  if (view === 'assets') {
    return (
      <div className="flex flex-col items-center">
        <h2 className="text-xl font-bold mb-4">{walletName} - Assets</h2>
        <p>Your crypto assets will appear here.</p>
        {/* You would add your actual assets display here */}
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div className="flex flex-col items-center">
        <h2 className="text-xl font-bold mb-4">{walletName} - Transaction History</h2>
        <p>Your transaction history will appear here.</p>
        {/* You would add your actual transaction history here */}
      </div>
    );
  }

  if (view === 'info') {
    return (
      <div className="flex flex-col items-center">
        <h2 className="text-xl font-bold mb-4">{walletName} - Wallet Info</h2>
        <p>Your wallet information and details will appear here.</p>
        <p className="mt-4">
          Reset: <PrimaryButton onClick={handleReset}>Reset Onboarding</PrimaryButton>
        </p>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-bold mb-4">Unknown View</h2>
      <p>Please select a valid view.</p>
    </div>
  );
}

export default Popup;
