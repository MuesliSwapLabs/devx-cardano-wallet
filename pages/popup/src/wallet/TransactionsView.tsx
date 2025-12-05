import { useState, useEffect } from 'react';
import { useParams, useLoaderData } from 'react-router-dom';
import type { TransactionRecord, WalletRecord } from '@extension/storage';
import { devxData } from '@extension/storage';
import { useSyncStatus } from '../hooks/useSyncStatus';
import Transactions from './Transactions';

const TransactionsView = () => {
  const { walletId } = useParams<{ walletId: string }>();
  const { wallet: loaderWallet, transactions: loaderTransactions } = useLoaderData() as {
    wallet: WalletRecord;
    transactions: TransactionRecord[];
  };

  const [transactions, setTransactions] = useState(loaderTransactions);

  // Use the sync status hook to listen for sync progress (sync is triggered by MainLayout)
  const { syncState } = useSyncStatus(walletId);
  const transactionsSyncState = syncState.transactions;

  // Reset transactions when wallet/data changes
  useEffect(() => {
    setTransactions(loaderTransactions);
  }, [loaderTransactions]);

  // Refresh transactions when sync completes
  useEffect(() => {
    if (transactionsSyncState.status === 'completed' && walletId) {
      devxData.getWalletTransactions(walletId).then(freshTransactions => {
        setTransactions(freshTransactions);
      });
    }
  }, [transactionsSyncState.status, walletId]);

  return (
    <div className="relative flex h-full flex-col">
      {/* Transactions list */}
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-sm text-gray-600 dark:text-gray-400">No transactions yet</div>
        </div>
      ) : (
        <div>
          <Transactions wallet={loaderWallet} transactions={transactions} />
        </div>
      )}

      {/* Sync status notification - only show during active sync */}
      {(transactionsSyncState.status === 'progress' || transactionsSyncState.status === 'started') && (
        <div className="fixed inset-x-0 bottom-16 z-10 bg-blue-600 px-4 py-2 text-center text-xs text-white shadow-lg">
          {transactionsSyncState.progress
            ? `Syncing transactions ${transactionsSyncState.progress.current}/${transactionsSyncState.progress.total}...`
            : transactionsSyncState.message || 'Syncing transactions...'}
        </div>
      )}
    </div>
  );
};

export default TransactionsView;
