import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Wallet } from '@extension/shared';
import type { TransactionRecord } from '@extension/storage';

interface EnhancedTransactionsProps {
  wallet: Wallet;
}

const EnhancedTransactions: React.FC<EnhancedTransactionsProps> = ({ wallet }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);

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
        <div className="flex justify-between items-center mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
          <h3 className="text-md font-semibold">Enhanced Transactions</h3>
          <button
            onClick={handleManualSync}
            disabled={loading}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
            Sync
          </button>
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
        <div className="flex justify-between items-center mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
          <h3 className="text-md font-semibold">Enhanced Transactions</h3>
          <button
            onClick={handleManualSync}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
            Retry
          </button>
        </div>
        <div className="text-red-500 text-sm mt-4">Error: {error}</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
          <h3 className="text-md font-semibold">Enhanced Transactions</h3>
          <button
            onClick={handleManualSync}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
            Sync
          </button>
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
      <div className="flex justify-between items-center mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
        <h3 className="text-md font-semibold">Enhanced Transactions</h3>
        <div className="flex items-center gap-2">
          {syncStatus && (
            <div className="text-xs text-gray-500">
              Last sync: {syncStatus.lastSync === 0 ? 'Never' : formatTimeSince(syncStatus.lastSync)}
              {syncStatus.isSyncing && ' (Syncing...)'}
            </div>
          )}
          <button
            onClick={handleManualSync}
            disabled={syncStatus?.isSyncing}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
            {syncStatus?.isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        {transactions.map((tx, index) => (
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
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono truncate">{tx.hash}</div>
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
              <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
                <div className="space-y-3 text-xs">
                  <div>
                    <strong>Hash:</strong>
                    <span className="font-mono ml-2 break-all">{tx.hash}</span>
                  </div>
                  <div>
                    <strong>Size:</strong> {tx.size} bytes
                  </div>
                  <div>
                    <strong>Fee:</strong> {formatAda(tx.fees)}
                  </div>
                  <div>
                    <strong>Valid contract:</strong> {tx.valid_contract ? 'Yes' : 'No'}
                  </div>

                  {/* Enhanced Data Section */}
                  {tx.enhancedData && (
                    <>
                      <div className="border-t border-gray-300 dark:border-gray-500 pt-2 mt-3">
                        <strong className="text-blue-600 dark:text-blue-400">Enhanced Transaction Data:</strong>
                      </div>

                      {/* Inputs */}
                      {tx.enhancedData.inputs && tx.enhancedData.inputs.length > 0 && (
                        <div>
                          <strong>Inputs ({tx.enhancedData.inputs.length}):</strong>
                          <div className="ml-2 mt-1 space-y-1">
                            {tx.enhancedData.inputs.map((input, idx) => (
                              <div key={idx} className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                <div>
                                  <strong>UTXO:</strong>
                                  <Link
                                    to={`/wallet/${wallet.id}/utxo/${input.transaction_id}/${input.output_index}`}
                                    className="ml-1 text-blue-600 dark:text-blue-400 hover:underline font-mono">
                                    {input.transaction_id.slice(0, 8)}...:{input.output_index}
                                  </Link>
                                </div>
                                {input.amount && (
                                  <div className="mt-1">
                                    {input.amount.map((amt, amtIdx) => (
                                      <div key={amtIdx}>
                                        {amt.unit === 'lovelace'
                                          ? formatAda(amt.quantity)
                                          : `${amt.quantity} ${amt.unit.slice(0, 8)}...`}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Outputs */}
                      {tx.enhancedData.outputs && tx.enhancedData.outputs.length > 0 && (
                        <div>
                          <strong>Outputs ({tx.enhancedData.outputs.length}):</strong>
                          <div className="ml-2 mt-1 space-y-1">
                            {tx.enhancedData.outputs.map((output, idx) => (
                              <div key={idx} className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                <div>
                                  <strong>UTXO:</strong>
                                  <Link
                                    to={`/wallet/${wallet.id}/utxo/${tx.hash}/${idx}`}
                                    className="ml-1 text-blue-600 dark:text-blue-400 hover:underline font-mono">
                                    {tx.hash.slice(0, 8)}...:{idx}
                                  </Link>
                                </div>
                                <div>
                                  <strong>Address:</strong> {output.address.slice(0, 20)}...
                                </div>
                                {output.amount && (
                                  <div className="mt-1">
                                    {output.amount.map((amt, amtIdx) => (
                                      <div key={amtIdx}>
                                        {amt.unit === 'lovelace'
                                          ? formatAda(amt.quantity)
                                          : `${amt.quantity} ${amt.unit.slice(0, 8)}...`}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="text-gray-500 border-t border-gray-300 dark:border-gray-500 pt-2">
                    <em>Data from IndexedDB cache (synced with Blockfrost API)</em>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Statistics */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
        <strong>Cache Info:</strong> {transactions.length} transactions cached
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
