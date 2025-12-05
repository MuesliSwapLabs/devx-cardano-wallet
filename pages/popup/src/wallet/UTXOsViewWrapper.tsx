import { useState, useEffect } from 'react';
import { useParams, useLoaderData } from 'react-router-dom';
import type { UTXORecord, TransactionRecord, WalletRecord } from '@extension/storage';
import { devxData } from '@extension/storage';
import { useSyncStatus } from '../hooks/useSyncStatus';
import UTXOsView from './UTXOsView';

const UTXOsViewWrapper = () => {
  const { walletId } = useParams<{ walletId: string }>();
  const {
    wallet: loaderWallet,
    utxos: loaderUtxos,
    transactions: loaderTransactions,
  } = useLoaderData() as {
    wallet: WalletRecord;
    utxos: UTXORecord[];
    transactions: TransactionRecord[];
  };

  const [utxos, setUtxos] = useState(loaderUtxos);
  const [transactions, setTransactions] = useState(loaderTransactions);

  // Use the sync status hook to listen for sync progress (sync is triggered by MainLayout)
  const { syncState } = useSyncStatus(walletId);
  const utxosSyncState = syncState.utxos;

  // Reset state when loader data changes
  useEffect(() => {
    setUtxos(loaderUtxos);
    setTransactions(loaderTransactions);
  }, [loaderUtxos, loaderTransactions]);

  // Refresh UTXOs when sync completes
  useEffect(() => {
    if (utxosSyncState.status === 'completed' && walletId) {
      Promise.all([devxData.getWalletUTXOs(walletId), devxData.getWalletTransactions(walletId)]).then(
        ([freshUtxos, txs]) => {
          setUtxos(freshUtxos);
          setTransactions(txs);
        },
      );
    }
  }, [utxosSyncState.status, walletId]);

  return (
    <div className="relative flex h-full flex-col">
      {/* UTXO list */}
      {utxos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-sm text-gray-600 dark:text-gray-400">No UTXOs yet</div>
        </div>
      ) : (
        <div>
          <UTXOsView wallet={loaderWallet} utxos={utxos} transactions={transactions} />
        </div>
      )}

      {/* Sync status notification - only show during active sync */}
      {(utxosSyncState.status === 'progress' || utxosSyncState.status === 'started') && (
        <div className="fixed inset-x-0 bottom-16 z-10 bg-blue-600 px-4 py-2 text-center text-xs text-white shadow-lg">
          {utxosSyncState.progress
            ? `Syncing UTXOs ${utxosSyncState.progress.current}/${utxosSyncState.progress.total}...`
            : utxosSyncState.message || 'Syncing UTXOs...'}
        </div>
      )}
    </div>
  );
};

export default UTXOsViewWrapper;
