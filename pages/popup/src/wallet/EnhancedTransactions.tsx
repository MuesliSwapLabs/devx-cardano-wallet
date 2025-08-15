import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Wallet } from '@extension/shared';
import type { TransactionRecord } from '@extension/storage';
import TransactionDetail from './TransactionDetail';

interface EnhancedTransactionsProps {
  wallet: Wallet;
}

const EnhancedTransactions: React.FC<EnhancedTransactionsProps> = ({ wallet }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  useEffect(() => {
    const fetchTransactions = () => {
      setLoading(true);
      setError(null);

      // Fetch enhanced transactions with auto-sync
      chrome.runtime.sendMessage(
        {
          type: 'GET_ENHANCED_TRANSACTIONS',
          payload: { walletId: wallet.id },
        },
        response => {
          if (response?.success) {
            setTransactions(response.transactions || []);

            // Handle sync status and show auto-sync indicator
            if (response.syncStatus) {
              setSyncStatus(response.syncStatus);
              if (response.syncStatus.isStale && !response.syncStatus.isActive) {
                setIsAutoSyncing(true);
                // Auto-sync will complete in background, listen for updates
              }
            }
          } else {
            console.error('Failed to fetch enhanced transactions:', response?.error);
            if (response?.error && response.error.includes('No API key configured')) {
              setError(`${response.error}. Please configure your Blockfrost API key in Settings.`);
            } else {
              setError(
                response?.error || 'Failed to fetch transactions. Please check your network connection and API key.',
              );
            }
          }
          setLoading(false);
        },
      );
    };

    const fetchSyncStatus = () => {
      chrome.runtime.sendMessage(
        {
          type: 'GET_SYNC_STATUS',
          payload: { walletId: wallet.id },
        },
        response => {
          if (response?.success) {
            setSyncStatus(response.status);
          }
        },
      );
    };

    fetchTransactions();
    fetchSyncStatus();

    // Listen for sync status updates from background
    const handleMessage = (message: any) => {
      if (message.type === 'SYNC_STATUS_UPDATE' && message.payload.walletId === wallet.id) {
        setSyncStatus(message.payload.status);
        setIsAutoSyncing(message.payload.status.isActive);

        // Refresh data when sync completes
        if (!message.payload.status.isActive && !message.payload.status.isStale) {
          fetchTransactions();
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [wallet.id]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAda = (lovelace: string) => {
    return (parseInt(lovelace) / 1000000).toFixed(6) + ' ADA';
  };

  const formatTimeSince = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const toggleExpanded = (txHash: string) => {
    setExpandedTx(expandedTx === txHash ? null : txHash);
  };

  // Filter transactions based on search query
  const filteredTransactions = transactions.filter(tx => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    // Search in transaction hash
    if (tx.hash.toLowerCase().includes(query)) return true;

    // Search in enhanced data if available
    if (tx.enhancedData) {
      // Search in input addresses
      if (tx.enhancedData.inputs?.some(input => input.address.toLowerCase().includes(query))) return true;

      // Search in output addresses
      if (tx.enhancedData.outputs?.some(output => output.address.toLowerCase().includes(query))) return true;

      // Search in asset policy IDs and names
      if (
        tx.enhancedData.outputs?.some(output =>
          output.amount.some(
            asset =>
              asset.unit.toLowerCase().includes(query) ||
              (asset.unit !== 'lovelace' && asset.unit.toLowerCase().includes(query)),
          ),
        )
      )
        return true;
    }

    // Search in fees
    if (tx.fees.includes(query)) return true;

    // Search in block height
    if (tx.block_height.toString().includes(query)) return true;

    return false;
  });

  const handleManualSync = () => {
    setLoading(true);
    chrome.runtime.sendMessage(
      {
        type: 'SYNC_WALLET',
        payload: { walletId: wallet.id, forceFullSync: true },
      },
      response => {
        if (response?.success) {
          // Refresh transactions after sync
          chrome.runtime.sendMessage(
            {
              type: 'GET_ENHANCED_TRANSACTIONS',
              payload: { walletId: wallet.id },
            },
            response => {
              if (response?.success) {
                setTransactions(response.transactions || []);
              }
              setLoading(false);
            },
          );
        } else {
          setLoading(false);
          setError(response?.error || 'Failed to sync wallet');
        }
      },
    );
  };

  if (loading) {
    return (
      <div>
        <div className="mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-semibold">Enhanced Transactions</h3>
            <button
              onClick={handleManualSync}
              disabled={loading}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
              Sync
            </button>
          </div>
          <input
            type="text"
            placeholder="Search transactions (hash, address, block, etc.)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Loading transactions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-semibold">Enhanced Transactions</h3>
            <button
              onClick={handleManualSync}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
              Retry
            </button>
          </div>
          <input
            type="text"
            placeholder="Search transactions (hash, address, block, etc.)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="text-red-500 text-sm mt-4">Error: {error}</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div>
        <div className="mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-semibold">Enhanced Transactions</h3>
            <button
              onClick={handleManualSync}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
              Sync
            </button>
          </div>
          <input
            type="text"
            placeholder="Search transactions (hash, address, block, etc.)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <p className="text-sm text-gray-400 mt-4">No transactions found for this wallet.</p>
        {syncStatus && (
          <div className="text-xs text-gray-500 mt-2">
            Last sync: {syncStatus.lastSync === 0 ? 'Never' : formatTimeSince(syncStatus.lastSync)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold">Enhanced Transactions</h3>
          <div className="flex items-center gap-2">
            {isAutoSyncing && (
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
                <span>Syncing new data...</span>
              </div>
            )}
            {syncStatus && !isAutoSyncing && (
              <div className="text-xs text-gray-500">
                Last sync: {syncStatus.lastSync === 0 ? 'Never' : formatTimeSince(syncStatus.lastSync)}
                {syncStatus.isActive && ' (Syncing...)'}
              </div>
            )}
            <button
              onClick={handleManualSync}
              disabled={syncStatus?.isActive || isAutoSyncing}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
              {syncStatus?.isActive || isAutoSyncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search transactions (hash, address, block, etc.)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-2 mt-4">
        {filteredTransactions.length === 0 && searchQuery.trim() ? (
          <div className="text-center py-8">
            <div className="text-sm text-gray-500">No transactions match your search for "{searchQuery}"</div>
            <button onClick={() => setSearchQuery('')} className="text-xs text-blue-500 hover:text-blue-600 mt-2">
              Clear search
            </button>
          </div>
        ) : (
          filteredTransactions.map((tx, index) => (
            <div key={tx.hash || index} className="border border-gray-200 dark:border-gray-700 rounded-lg">
              <div
                className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => toggleExpanded(tx.hash)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Transaction
                      {tx.enhancedData && (
                        <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                          Enhanced
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(tx.block_time)}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono break-all">
                      {tx.hash.slice(0, 20)}...{tx.hash.slice(-8)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Cached: {formatTimeSince(tx.lastSynced)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Fee: {formatAda(tx.fees)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Block #{tx.block_height}</div>
                    {tx.enhancedData && (
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {tx.enhancedData.outputs?.length || 0} UTXOs
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {expandedTx === tx.hash && (
                <TransactionDetail tx={tx} wallet={wallet} formatAda={formatAda} formatDate={formatDate} />
              )}
            </div>
          ))
        )}
      </div>

      {/* Statistics */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
        <strong>Cache Info:</strong> {transactions.length} transactions cached, {filteredTransactions.length} shown
        {syncStatus && (
          <>
            <br />
            <strong>Sync Status:</strong> {syncStatus.isStale ? 'Data may be stale' : 'Data is fresh'}
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedTransactions;
