import { useState, useEffect } from 'react';
import { useParams, useLoaderData } from 'react-router-dom';
import type { UTXORecord, TransactionRecord } from '@extension/storage';
import { devxData, devxSettings } from '@extension/storage';
import { syncWalletUtxos } from '@extension/cardano-provider';
import { BlockfrostClient } from '@extension/cardano-provider';
import UTXOsView from './UTXOsView';

const UTXOsViewWrapper = () => {
  const { walletId } = useParams<{ walletId: string }>();
  const { utxos: loaderUtxos, lastFetchedBlockUtxos: initialLastBlock } = useLoaderData() as {
    utxos: UTXORecord[];
    lastFetchedBlockUtxos: number;
  };

  const [utxos, setUtxos] = useState(loaderUtxos);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'uptodate' | null>(null);
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

        // Also load transactions for the UI
        const txs = await devxData.getWalletTransactions(walletId);
        setTransactions(txs);

        const apiKey = walletData.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;
        if (!apiKey) return;

        const client = new BlockfrostClient({ apiKey, network: walletData.network });
        const latestBlock = await client.getLatestBlock();

        if (latestBlock.height && latestBlock.height > initialLastBlock) {
          // Show syncing status immediately before fetching
          setSyncStatus('syncing');

          // Sync UTXOs and get count of changes
          const changedCount = await syncWalletUtxos(
            walletData,
            latestBlock.height,
            loaderUtxos as any,
            (current, total) => {
              // Progress callback if needed in future
            },
          );

          // Refresh UTXOs display if anything changed
          if (changedCount > 0) {
            const freshUtxos = await devxData.getWalletUTXOs(walletId);
            setUtxos(freshUtxos);
          }

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
        console.error('Failed to check/sync UTXOs:', error);
        setSyncStatus(null);
      }
    };

    checkAndSync();
  }, [walletId]);

  if (!wallet) {
    return <div>Loading wallet...</div>;
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* UTXO list */}
      {utxos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-sm text-gray-600 dark:text-gray-400">No UTXOs yet</div>
        </div>
      ) : (
        <div>
          <UTXOsView wallet={wallet} utxos={utxos} transactions={transactions} />
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
          {syncStatus === 'syncing' ? <span>Syncing...</span> : <span>✓ Up to date</span>}
        </div>
      )}
    </div>
  );
};

export default UTXOsViewWrapper;
