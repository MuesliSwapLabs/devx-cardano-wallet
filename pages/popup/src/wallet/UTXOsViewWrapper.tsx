import { useState, useEffect } from 'react';
import { useParams, useLoaderData } from 'react-router-dom';
import type { UTXORecord, TransactionRecord } from '@extension/storage';
import { devxData, devxSettings } from '@extension/storage';
import { syncWalletUtxos, syncWalletTransactions, syncWalletPaymentAddresses } from '@extension/cardano-provider';
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

        // Load existing transactions for the UI
        const txs = await devxData.getWalletTransactions(walletId);
        setTransactions(txs);

        const apiKey = walletData.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;
        if (!apiKey) return;

        // Step 1: Get sync state
        const lastFetchedBlockTransactions = walletData.lastFetchedBlockTransactions || 0;
        const lastFetchedBlockUtxos = initialLastBlock;

        const client = new BlockfrostClient({ apiKey, network: walletData.network });
        const latestBlock = await client.getLatestBlock();
        const currentBlock = latestBlock.height;

        // Step 2: Check if sync needed
        if (!currentBlock || currentBlock <= lastFetchedBlockUtxos) {
          // Already up to date
          setSyncStatus('uptodate');
          setShouldAnimate(false);
          setTimeout(() => setShouldAnimate(true), 10);
          setHasSynced(true);
          return;
        }

        // Step 3: Determine which transactions to process
        let transactionsToProcess: TransactionRecord[] = [];

        // Case A: Transaction sync is ahead of UTXO sync
        if (lastFetchedBlockTransactions > lastFetchedBlockUtxos) {
          // Get transactions from DB that are newer than last UTXO sync
          const allDbTransactions = await devxData.getWalletTransactions(walletId);
          const dbTransactions = allDbTransactions.filter(tx => tx.block_height > lastFetchedBlockUtxos);

          transactionsToProcess.push(...dbTransactions);

          // Also fetch NEW transactions if blockchain moved forward
          if (currentBlock > lastFetchedBlockTransactions) {
            setSyncStatus('syncing'); // Show blue spinner

            const newTxCount = await syncWalletTransactions(walletData, currentBlock, allDbTransactions);

            // Get the newly synced transactions
            if (newTxCount > 0) {
              const freshTransactions = await devxData.getWalletTransactions(walletId);
              const newTransactions = freshTransactions.filter(tx => tx.block_height > lastFetchedBlockTransactions);
              transactionsToProcess.push(...newTransactions);
            }
          }
        }
        // Case B: UTXO sync is ahead or equal to transaction sync
        else {
          // Only fetch new transactions from Blockfrost
          if (currentBlock > lastFetchedBlockUtxos) {
            setSyncStatus('syncing'); // Show blue spinner

            const allDbTransactions = await devxData.getWalletTransactions(walletId);
            const newTxCount = await syncWalletTransactions(walletData, currentBlock, allDbTransactions);

            if (newTxCount > 0) {
              const freshTransactions = await devxData.getWalletTransactions(walletId);
              const newTransactions = freshTransactions.filter(tx => tx.block_height > lastFetchedBlockUtxos);
              transactionsToProcess.push(...newTransactions);
            }
          }
        }

        // Step 4: Build UTXOs from transactions
        if (transactionsToProcess.length > 0) {
          // Sort transactions by block height (oldest first)
          transactionsToProcess.sort((a, b) => a.block_height - b.block_height);

          // Fetch/cache all payment addresses for this wallet (for external UTXO detection)
          const paymentAddresses = await syncWalletPaymentAddresses(walletData, currentBlock);

          // Build complete UTXO list
          const changeCount = await syncWalletUtxos(
            walletData,
            currentBlock,
            loaderUtxos,
            transactionsToProcess,
            paymentAddresses,
          );

          // Refresh display if anything changed
          if (changeCount > 0) {
            const freshUtxos = await devxData.getWalletUTXOs(walletId);
            setUtxos(freshUtxos);
          }
        }

        // Step 5: Show completion
        setSyncStatus('uptodate');
        setShouldAnimate(false);
        setTimeout(() => setShouldAnimate(true), 10);
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
