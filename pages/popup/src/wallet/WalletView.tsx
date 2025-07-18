import React from 'react';
import { useParams } from 'react-router-dom';
import { useStorage, walletsStorage } from '@extension/storage';
import { Wallet, EnrichedAsset } from '@extension/shared';
import TransactionHistory from './TransactionHistory';

// Helper to format Lovelace to ADA
const formatAda = (lovelace: string) => {
  const ada = parseInt(lovelace, 10) / 1_000_000;
  return ada.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
};

const AssetDisplay = ({ asset }: { asset: EnrichedAsset }) => {
  return (
    <div className="flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700">
      <span className="font-mono text-sm">{asset.name}</span>
      <span className="font-semibold">{parseInt(asset.quantity, 10).toLocaleString()}</span>
    </div>
  );
};

const WalletView = () => {
  const { walletId, view = 'assets' } = useParams();
  const walletsData = useStorage(walletsStorage);
  const wallets = walletsData?.wallets || [];
  const wallet = wallets.find((w: Wallet) => w.id === walletId);

  if (!wallet) {
    return <div>Loading wallet...</div>;
  }

  return (
    // This component now only contains the content for the <Outlet />
    // The main balance and wallet info is already in MainLayout.
    <div className="flex flex-col h-full">
      {view === 'assets' && (
        <div>
          <h3 className="text-md font-semibold mb-2 border-b border-gray-300 dark:border-gray-600">Tokens</h3>
          {wallet.assets && wallet.assets.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              {(wallet.assets as EnrichedAsset[]).map(asset => (
                <AssetDisplay key={asset.unit} asset={asset} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-4">This wallet holds no other tokens.</p>
          )}
        </div>
      )}

      {view === 'history' && <TransactionHistory wallet={wallet} />}
    </div>
  );
};

export default WalletView;
