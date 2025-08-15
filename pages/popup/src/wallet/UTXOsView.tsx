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
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

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

            // Handle sync status and show auto-sync indicator
            if (response.syncStatus) {
              setSyncStatus(response.syncStatus);
              if (response.syncStatus.isStale && !response.syncStatus.isActive) {
                setIsAutoSyncing(true);
                // Auto-sync will complete in background, listen for updates
              }
            }
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

    // Listen for sync status updates from background
    const handleMessage = (message: any) => {
      if (message.type === 'SYNC_STATUS_UPDATE' && message.payload.walletId === wallet.id) {
        setSyncStatus(message.payload.status);
        setIsAutoSyncing(message.payload.status.isActive);

        // Refresh data when sync completes
        if (!message.payload.status.isActive && !message.payload.status.isStale) {
          fetchUTXOs();
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
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
    // First apply the spent/unspent filter
    let passesSpentFilter = true;
    switch (filter) {
      case 'unspent':
        passesSpentFilter = !utxo.isSpent;
        break;
      case 'spent':
        passesSpentFilter = utxo.isSpent;
        break;
      case 'all':
      default:
        passesSpentFilter = true;
        break;
    }

    if (!passesSpentFilter) return false;

    // Then apply the search filter
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    // Search in transaction hash
    if (utxo.tx_hash.toLowerCase().includes(query)) return true;

    // Search in output index
    if (utxo.output_index.toString().includes(query)) return true;

    // Search in address
    if (utxo.address.toLowerCase().includes(query)) return true;

    // Search in asset units/policy IDs
    if (utxo.amount.some(asset => asset.unit.toLowerCase().includes(query) || asset.quantity.includes(query)))
      return true;

    // Search in spent transaction hash if available
    if (utxo.spentInTx && utxo.spentInTx.toLowerCase().includes(query)) return true;

    return false;
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
        <div className="mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-semibold">UTXOs</h3>
            <button
              onClick={handleManualSync}
              disabled={loading}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
              Sync
            </button>
          </div>
          <input
            type="text"
            placeholder="Search UTXOs (hash, address, asset, etc.)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
        <div className="mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-semibold">UTXOs</h3>
            <button
              onClick={handleManualSync}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
              Retry
            </button>
          </div>
          <input
            type="text"
            placeholder="Search UTXOs (hash, address, asset, etc.)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="text-red-500 text-sm mt-4">Error: {error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold">UTXOs</h3>
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
          placeholder="Search UTXOs (hash, address, asset, etc.)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
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
            {filteredUtxos.length !== stats.total && ` (${filteredUtxos.length} shown)`}
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
            {searchQuery.trim()
              ? `No UTXOs match your search for \"${searchQuery}\"`
              : `No ${filter === 'all' ? '' : filter + ' '}UTXOs found for this wallet.`}
          </p>
          {searchQuery.trim() && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-blue-500 hover:text-blue-600 mt-2">
              Clear search
            </button>
          )}
          {!searchQuery.trim() && syncStatus && (
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
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono break-all">
                        {utxo.tx_hash.slice(0, 16)}...:{utxo.output_index}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="font-semibold">Address:</span>
                        <div className="font-mono text-xs break-all mt-0.5 bg-gray-100 dark:bg-gray-700 p-1 rounded">
                          {utxo.address}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Cached: {formatTimeSince(utxo.lastSynced)}</div>
                      {utxo.isSpent && utxo.spentInTx && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Spent in:
                          <Link
                            to={`/wallet/${wallet.id}/enhanced-transactions`}
                            className="ml-1 text-red-700 dark:text-red-300 hover:underline font-mono">
                            {utxo.spentInTx.slice(0, 16)}...
                          </Link>
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
                        <strong>Assets ({utxo.amount.length}):</strong>
                        <div className="ml-2 mt-1 space-y-1">
                          {utxo.amount.map((asset, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded ${
                                asset.unit === 'lovelace'
                                  ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                                  : 'bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700'
                              }`}>
                              {asset.unit === 'lovelace' ? (
                                <div>
                                  <div className="flex justify-between items-center">
                                    <strong className="text-blue-900 dark:text-blue-100">Cardano (ADA)</strong>
                                    <span className="font-bold text-blue-900 dark:text-blue-100">
                                      {formatAda(asset.quantity)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                    {parseInt(asset.quantity).toLocaleString()} Lovelace
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex justify-between items-start mb-1">
                                    <strong className="text-purple-900 dark:text-purple-100 text-xs">
                                      Native Asset
                                    </strong>
                                    <span className="font-bold text-purple-900 dark:text-purple-100">
                                      {parseInt(asset.quantity).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="text-xs text-purple-700 dark:text-purple-300">
                                    <strong>Policy ID:</strong>
                                    <div className="font-mono break-all mt-1">{asset.unit.slice(0, 56)}</div>
                                  </div>
                                  {asset.unit.length > 56 && (
                                    <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                                      <strong>Asset Name:</strong>
                                      <div className="font-mono break-all">{asset.unit.slice(56)}</div>
                                    </div>
                                  )}
                                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                    <strong>Full Unit:</strong>
                                    <div className="font-mono break-all text-xs bg-white dark:bg-gray-800 p-1 rounded mt-1">
                                      {asset.unit}
                                    </div>
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
                      <div className="border-t border-gray-300 dark:border-gray-500 pt-2 flex flex-wrap gap-2">
                        <Link
                          to={`/wallet/${wallet.id}/utxo/${utxo.tx_hash}/${utxo.output_index}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                          📄 View Details
                        </Link>
                        <Link
                          to={`/wallet/${wallet.id}/enhanced-transactions`}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                          🔗 View in Transactions
                        </Link>
                        {utxo.isSpent && utxo.spentInTx && (
                          <span className="text-xs text-gray-500">💸 Spent in TX</span>
                        )}
                        {!utxo.isSpent && (
                          <span className="text-xs text-green-600 dark:text-green-400">✅ Unspent</span>
                        )}
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
