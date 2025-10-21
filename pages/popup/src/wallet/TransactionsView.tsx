import { useState, useEffect } from 'react';
import { useParams, useLoaderData } from 'react-router-dom';
import type { TransactionRecord } from '@extension/storage';
import { devxData, devxSettings } from '@extension/storage';
import { syncWalletTransactions } from '@extension/cardano-provider';
import { BlockfrostClient } from '@extension/cardano-provider';
import Transactions from './Transactions';

const TransactionsView = () => {
  const { walletId } = useParams<{ walletId: string }>();
  const { transactions: loaderTransactions, lastFetchedBlockTransactions: initialLastBlock } = useLoaderData() as {
    transactions: TransactionRecord[];
    lastFetchedBlockTransactions: number;
  };

  const [transactions, setTransactions] = useState(loaderTransactions);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'uptodate' | null>(null);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    // Only run sync once per mount
    if (hasSynced) {
      return;
    }

    const checkAndSync = async () => {
      if (!walletId) return;

      try {
        const settings = await devxSettings.get();
        const walletData = await devxData.getWallet(walletId);
        if (!walletData) return;

        setWallet(walletData);

        const apiKey = walletData.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;
        if (!apiKey) return;

        const client = new BlockfrostClient({ apiKey, network: walletData.network });
        const latestBlock = await client.getLatestBlock();

        if (latestBlock.height && latestBlock.height > initialLastBlock) {
          // Sync transactions and get count of new/changed transactions
          const changedCount = await syncWalletTransactions(
            walletData,
            latestBlock.height, // Pass current blockchain height
            loaderTransactions as any,
            (current, total) => {
              // Only show progress if there are new transactions
              setSyncStatus('syncing');
              setSyncProgress({ current, total });
            },
          );

          // Refresh transactions display if anything changed
          if (changedCount > 0) {
            const freshTransactions = await devxData.getWalletTransactions(walletId);
            setTransactions(freshTransactions);
          }

          // Database has been updated with current block height by syncWalletTransactions

          // Always show green "up to date" after syncing
          setSyncStatus('uptodate');
          setShouldAnimate(false);
          setTimeout(() => setShouldAnimate(true), 10);
        } else {
          // Already up to date - show green box briefly
          setSyncStatus('uptodate');
          setShouldAnimate(false);
          setTimeout(() => setShouldAnimate(true), 10);
        }

        setHasSynced(true);
      } catch (error) {
        console.error('Failed to check/sync transactions:', error);
        setSyncStatus(null);
      }
    };

    checkAndSync();
  }, [walletId]); // Only depend on walletId, not lastFetchedBlockTransactions

  if (!wallet) {
    return <div>Loading wallet...</div>;
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Transactions list */}
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-sm text-gray-600 dark:text-gray-400">No transactions yet</div>
        </div>
      ) : (
        <div>
          <Transactions wallet={wallet} transactions={transactions} />
        </div>
      )}

      {/* Sync status notification - fixed above bottom nav */}
      {syncStatus && (
        <div
          className={`fixed inset-x-0 bottom-16 z-10 px-4 py-2 text-center text-xs text-white shadow-lg ${
            syncStatus === 'syncing' ? 'bg-blue-600' : `bg-green-600 ${shouldAnimate ? 'animate-fade-out-delayed' : ''}`
          }`}
          onAnimationEnd={() => {
            if (syncStatus === 'uptodate') {
              setSyncStatus(null);
              setShouldAnimate(false);
            }
          }}>
          {syncStatus === 'syncing' ? (
            <span>
              Syncing {syncProgress.current}/{syncProgress.total}...
            </span>
          ) : (
            <span>✓ Up to date</span>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionsView;
