import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Wallet } from '@extension/shared';
import type { UTXORecord } from '@extension/storage';

interface UTXOsViewProps {
  wallet: Wallet;
}

const UTXOsView: React.FC<UTXOsViewProps> = ({ wallet }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [utxos, setUtxos] = useState<UTXORecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'unspent' | 'spent'>('unspent');
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [expandedUtxo, setExpandedUtxo] = useState<string | null>(null);

  useEffect(() => {
    const fetchUTXOs = () => {
      setLoading(true);
      setError(null);

      chrome.runtime.sendMessage(
        {
          type: 'GET_WALLET_UTXOS',
          payload: { walletId: wallet.id, includeSpent: true },
        },
        response => {
          if (response?.success) {
            setUtxos(response.utxos || []);
          } else {
            console.error('Failed to fetch UTXOs:', response?.error);
            if (response?.error && response.error.includes('No API key configured')) {
              setError(`${response.error}. Please configure your Blockfrost API key in Settings.`);
            } else {
              setError(response?.error || 'Failed to fetch UTXOs. Please check your network connection and API key.');
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

    fetchUTXOs();
    fetchSyncStatus();
  }, [wallet.id]);

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

  const handleManualSync = () => {
    setLoading(true);
    chrome.runtime.sendMessage(
      {
        type: 'SYNC_WALLET',
        payload: { walletId: wallet.id, forceFullSync: true },
      },
      response => {
        if (response?.success) {
          // Refresh UTXOs after sync
          chrome.runtime.sendMessage(
            {
              type: 'GET_WALLET_UTXOS',
              payload: { walletId: wallet.id, includeSpent: true },
            },
            response => {
              if (response?.success) {
                setUtxos(response.utxos || []);
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

  const toggleExpanded = (utxoKey: string) => {
    setExpandedUtxo(expandedUtxo === utxoKey ? null : utxoKey);
  };

  const filteredUtxos = utxos.filter(utxo => {
    switch (filter) {
      case 'unspent':
        return !utxo.isSpent;
      case 'spent':
        return utxo.isSpent;
      case 'all':
      default:
        return true;
    }
  });

  const stats = {
    total: utxos.length,
    unspent: utxos.filter(u => !u.isSpent).length,
    spent: utxos.filter(u => u.isSpent).length,
    totalValue: utxos
      .filter(u => !u.isSpent)
      .reduce((sum, utxo) => {
        const adaAmount = utxo.amount.find(a => a.unit === 'lovelace');
        return sum + (adaAmount ? parseInt(adaAmount.quantity) : 0);
      }, 0),
  };

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
          <h3 className="text-md font-semibold">UTXOs</h3>
          <button
            onClick={handleManualSync}
            disabled={loading}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
            Sync
          </button>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Loading UTXOs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex justify-between items-center mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
          <h3 className="text-md font-semibold">UTXOs</h3>
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

  return (
    <div>
      <div className="flex justify-between items-center mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
        <h3 className="text-md font-semibold">UTXOs</h3>
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

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded">
        <button
          onClick={() => setFilter('unspent')}
          className={`flex-1 py-1 px-2 text-xs rounded transition ${
            filter === 'unspent' ? 'bg-green-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}>
          Unspent ({stats.unspent})
        </button>
        <button
          onClick={() => setFilter('spent')}
          className={`flex-1 py-1 px-2 text-xs rounded transition ${
            filter === 'spent' ? 'bg-red-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}>
          Spent ({stats.spent})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1 px-2 text-xs rounded transition ${
            filter === 'all' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}>
          All ({stats.total})
        </button>
      </div>

      {/* Statistics */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>Total UTXOs:</strong> {stats.total}
          </div>
          <div>
            <strong>Unspent Value:</strong> {formatAda(stats.totalValue.toString())}
          </div>
          <div className="text-green-600 dark:text-green-400">
            <strong>Unspent:</strong> {stats.unspent}
          </div>
          <div className="text-red-600 dark:text-red-400">
            <strong>Spent:</strong> {stats.spent}
          </div>
        </div>
      </div>

      {filteredUtxos.length === 0 ? (
        <div>
          <p className="text-sm text-gray-400 mt-4">
            No {filter === 'all' ? '' : filter + ' '}UTXOs found for this wallet.
          </p>
          {syncStatus && (
            <div className="text-xs text-gray-500 mt-2">
              Last sync: {syncStatus.lastSync === 0 ? 'Never' : formatTimeSince(syncStatus.lastSync)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUtxos.map(utxo => {
            const utxoKey = `${utxo.tx_hash}:${utxo.output_index}`;
            const adaAmount = utxo.amount.find(a => a.unit === 'lovelace');
            const otherAssets = utxo.amount.filter(a => a.unit !== 'lovelace');

            return (
              <div key={utxoKey} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <div
                  className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => toggleExpanded(utxoKey)}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">UTXO</div>
                        <div
                          className={`text-xs px-2 py-0.5 rounded ${
                            utxo.isSpent
                              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                              : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          }`}>
                          {utxo.isSpent ? 'Spent' : 'Unspent'}
                        </div>
                        {otherAssets.length > 0 && (
                          <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                            +{otherAssets.length} asset{otherAssets.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                        {utxo.tx_hash.slice(0, 16)}...:{utxo.output_index}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Address: {utxo.address.slice(0, 20)}...</div>
                      <div className="text-xs text-gray-500 mt-1">Cached: {formatTimeSince(utxo.lastSynced)}</div>
                      {utxo.isSpent && utxo.spentInTx && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Spent in: {utxo.spentInTx.slice(0, 16)}...
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{adaAmount ? formatAda(adaAmount.quantity) : '0 ADA'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Block: {utxo.block}</div>
                    </div>
                  </div>
                </div>

                {expandedUtxo === utxoKey && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
                    <div className="space-y-3 text-xs">
                      <div>
                        <strong>Full Hash:</strong>
                        <span className="font-mono ml-2 break-all">{utxo.tx_hash}</span>
                      </div>
                      <div>
                        <strong>Output Index:</strong> {utxo.output_index}
                      </div>
                      <div>
                        <strong>Full Address:</strong>
                        <span className="font-mono ml-2 break-all">{utxo.address}</span>
                      </div>
                      <div>
                        <strong>Block:</strong> {utxo.block}
                      </div>

                      {/* Asset Details */}
                      <div>
                        <strong>Assets:</strong>
                        <div className="ml-2 mt-1 space-y-1">
                          {utxo.amount.map((asset, idx) => (
                            <div key={idx} className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                              {asset.unit === 'lovelace' ? (
                                <div>
                                  <strong>ADA:</strong> {formatAda(asset.quantity)}
                                </div>
                              ) : (
                                <div>
                                  <div>
                                    <strong>Unit:</strong> {asset.unit.slice(0, 16)}...
                                  </div>
                                  <div>
                                    <strong>Quantity:</strong> {parseInt(asset.quantity).toLocaleString()}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Technical Details */}
                      {(utxo.data_hash || utxo.inline_datum || utxo.reference_script_hash) && (
                        <div className="border-t border-gray-300 dark:border-gray-500 pt-2">
                          <strong>Technical Details:</strong>
                          {utxo.data_hash && (
                            <div className="ml-2 mt-1">
                              <strong>Data Hash:</strong> <span className="font-mono">{utxo.data_hash}</span>
                            </div>
                          )}
                          {utxo.inline_datum && (
                            <div className="ml-2 mt-1">
                              <strong>Inline Datum:</strong>{' '}
                              <span className="font-mono">{utxo.inline_datum.slice(0, 32)}...</span>
                            </div>
                          )}
                          {utxo.reference_script_hash && (
                            <div className="ml-2 mt-1">
                              <strong>Reference Script:</strong>{' '}
                              <span className="font-mono">{utxo.reference_script_hash}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Navigation Links */}
                      <div className="border-t border-gray-300 dark:border-gray-500 pt-2 flex gap-2">
                        <Link
                          to={`/wallet/${wallet.id}/utxo/${utxo.tx_hash}/${utxo.output_index}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline">
                          View Details
                        </Link>
                        <Link
                          to={`/wallet/${wallet.id}/enhanced-transactions`}
                          className="text-blue-600 dark:text-blue-400 hover:underline">
                          View in Transactions
                        </Link>
                      </div>

                      <div className="text-gray-500 border-t border-gray-300 dark:border-gray-500 pt-2">
                        <em>Data from IndexedDB cache (synced with Blockfrost API)</em>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UTXOsView;
