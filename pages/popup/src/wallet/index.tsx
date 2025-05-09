// Popup.tsx
import { PrimaryButton } from '@src/components/buttons';
import React from 'react';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';

import { exampleThemeStorage, appStateStorage } from '@extension/storage';
import { useParams } from 'react-router-dom';

function Popup() {
  const appState = useStorage(appStateStorage);

  // Get params from URL
  const { walletId = 'my-wallet', view = 'assets' } = useParams();

  // Convert kebab-case walletId to a display name
  const getWalletName = id => {
    return id
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const walletName = getWalletName(walletId);

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
        <p>
          Reset:{' '}
          <PrimaryButton
            onClick={() => {
              appStateStorage.unmarkOnboarded();
            }}>
            Reset Onboarding
          </PrimaryButton>
        </p>
        {/* You would add your actual wallet info here */}
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
