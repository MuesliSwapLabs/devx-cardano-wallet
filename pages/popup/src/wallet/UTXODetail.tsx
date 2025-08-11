import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useStorage, walletsStorage } from '@extension/storage';
import type { Wallet } from '@extension/shared';
import type { UTXORecord, TransactionRecord } from '@extension/storage';

const UTXODetail: React.FC = () => {
  const { walletId, txHash, outputIndex } = useParams<{ walletId: string; txHash: string; outputIndex: string }>();
  const navigate = useNavigate();
  const walletsData = useStorage(walletsStorage);
  const wallets = walletsData?.wallets || [];
  const wallet = wallets.find((w: Wallet) => w.id === walletId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [utxo, setUtxo] = useState<UTXORecord | null>(null);
  const [creatingTransaction, setCreatingTransaction] = useState<TransactionRecord | null>(null);
  const [spendingTransaction, setSpendingTransaction] = useState<TransactionRecord | null>(null);

  useEffect(() => {
    if (!txHash || !outputIndex || !wallet) {
      setError(!wallet ? 'Wallet not found' : 'Invalid UTXO reference');
      setLoading(false);
      return;
    }

    const fetchUTXODetails = () => {
      setLoading(true);
      setError(null);

      chrome.runtime.sendMessage(
        {
          type: 'GET_UTXO_DETAILS',
          payload: { txHash, outputIndex: parseInt(outputIndex) },
        },
        response => {
          if (response?.success) {
            setUtxo(response.utxo);

            // Fetch creating transaction details
            chrome.runtime.sendMessage(
              {
                type: 'GET_ENHANCED_TRANSACTIONS',
                payload: { walletId: wallet.id },
              },
              txResponse => {
                if (txResponse?.success) {
                  const transactions = txResponse.transactions as TransactionRecord[];

                  // Find creating transaction
                  const creating = transactions.find(tx => tx.hash === txHash);
                  if (creating) {
                    setCreatingTransaction(creating);
                  }

                  // Find spending transaction if UTXO is spent
                  if (response.utxo.isSpent && response.utxo.spentInTx) {
                    const spending = transactions.find(tx => tx.hash === response.utxo.spentInTx);
                    if (spending) {
                      setSpendingTransaction(spending);
                    }
                  }
                }
                setLoading(false);
              },
            );
          } else {
            console.error('Failed to fetch UTXO details:', response?.error);
            setError(response?.error || 'Failed to fetch UTXO details');
            setLoading(false);
          }
        },
      );
    };

    fetchUTXODetails();
  }, [txHash, outputIndex, wallet?.id]);

  const formatAda = (lovelace: string) => {
    return (parseInt(lovelace) / 1000000).toFixed(6) + ' ADA';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatTimeSince = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
            ← Back
          </button>
          <h2 className="text-lg font-semibold">UTXO Details</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Loading UTXO details...</div>
        </div>
      </div>
    );
  }

  if (error || !utxo || !wallet) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
            ← Back
          </button>
          <h2 className="text-lg font-semibold">UTXO Details</h2>
        </div>
        <div className="text-red-500 text-sm">{error || (!wallet ? 'Wallet not found' : 'UTXO not found')}</div>
      </div>
    );
  }

  const adaAmount = utxo.amount.find(a => a.unit === 'lovelace');
  const otherAssets = utxo.amount.filter(a => a.unit !== 'lovelace');

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          ← Back
        </button>
        <h2 className="text-lg font-semibold">UTXO Details</h2>
        <div
          className={`ml-auto text-sm px-3 py-1 rounded-full ${
            utxo.isSpent
              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
          }`}>
          {utxo.isSpent ? 'Spent' : 'Unspent'}
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-md font-semibold mb-3 text-gray-900 dark:text-gray-100">Basic Information</h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <strong className="text-gray-600 dark:text-gray-400">Transaction Hash:</strong>
              <div className="font-mono text-xs mt-1 break-all bg-white dark:bg-gray-900 p-2 rounded">
                {utxo.tx_hash}
              </div>
            </div>
            <div>
              <strong className="text-gray-600 dark:text-gray-400">Output Index:</strong>
              <div className="mt-1">{utxo.output_index}</div>
            </div>
            <div>
              <strong className="text-gray-600 dark:text-gray-400">Address:</strong>
              <div className="font-mono text-xs mt-1 break-all bg-white dark:bg-gray-900 p-2 rounded">
                {utxo.address}
              </div>
            </div>
            <div>
              <strong className="text-gray-600 dark:text-gray-400">Block:</strong>
              <div className="mt-1">{utxo.block}</div>
            </div>
          </div>
        </div>

        {/* Value Information */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-md font-semibold mb-3 text-gray-900 dark:text-gray-100">Value</h3>
          <div className="space-y-3">
            {/* ADA Amount */}
            {adaAmount && (
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-3">
                <div className="flex justify-between items-center">
                  <div className="text-blue-900 dark:text-blue-100 font-medium">Cardano (ADA)</div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {formatAda(adaAmount.quantity)}
                  </div>
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {parseInt(adaAmount.quantity).toLocaleString()} Lovelace
                </div>
              </div>
            )}

            {/* Other Assets */}
            {otherAssets.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
                  Native Assets ({otherAssets.length})
                </div>
                <div className="space-y-2">
                  {otherAssets.map((asset, idx) => (
                    <div key={idx} className="bg-purple-50 dark:bg-purple-900/30 rounded p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-purple-900 dark:text-purple-100 font-medium text-sm">Native Asset</div>
                          <div className="text-xs text-purple-700 dark:text-purple-300 mt-1 font-mono break-all">
                            {asset.unit}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-900 dark:text-purple-100">
                            {parseInt(asset.quantity).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Technical Details */}
        {(utxo.data_hash || utxo.inline_datum || utxo.reference_script_hash) && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-md font-semibold mb-3 text-gray-900 dark:text-gray-100">Technical Details</h3>
            <div className="space-y-3 text-sm">
              {utxo.data_hash && (
                <div>
                  <strong className="text-gray-600 dark:text-gray-400">Data Hash:</strong>
                  <div className="font-mono text-xs mt-1 break-all bg-white dark:bg-gray-900 p-2 rounded">
                    {utxo.data_hash}
                  </div>
                </div>
              )}
              {utxo.inline_datum && (
                <div>
                  <strong className="text-gray-600 dark:text-gray-400">Inline Datum:</strong>
                  <div className="font-mono text-xs mt-1 break-all bg-white dark:bg-gray-900 p-2 rounded max-h-32 overflow-y-auto">
                    {utxo.inline_datum}
                  </div>
                </div>
              )}
              {utxo.reference_script_hash && (
                <div>
                  <strong className="text-gray-600 dark:text-gray-400">Reference Script Hash:</strong>
                  <div className="font-mono text-xs mt-1 break-all bg-white dark:bg-gray-900 p-2 rounded">
                    {utxo.reference_script_hash}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction Information */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-md font-semibold mb-3 text-gray-900 dark:text-gray-100">Transaction History</h3>
          <div className="space-y-4">
            {/* Creating Transaction */}
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-green-700 dark:text-green-300">Created by Transaction</h4>
                  {creatingTransaction && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(creatingTransaction.block_time)} • Block #{creatingTransaction.block_height}
                    </div>
                  )}
                </div>
                <Link
                  to={`/wallet/${wallet.id}/enhanced-transactions`}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  View in Transactions
                </Link>
              </div>
              <div className="font-mono text-xs break-all bg-white dark:bg-gray-900 p-2 rounded">{utxo.tx_hash}</div>
            </div>

            {/* Spending Transaction */}
            {utxo.isSpent && utxo.spentInTx && (
              <div className="border-l-4 border-red-500 pl-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-red-700 dark:text-red-300">Spent by Transaction</h4>
                    {spendingTransaction && (
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(spendingTransaction.block_time)} • Block #{spendingTransaction.block_height}
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/wallet/${wallet.id}/enhanced-transactions`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    View in Transactions
                  </Link>
                </div>
                <div className="font-mono text-xs break-all bg-white dark:bg-gray-900 p-2 rounded">
                  {utxo.spentInTx}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cache Information */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-md font-semibold mb-3 text-gray-900 dark:text-gray-100">Cache Information</h3>
          <div className="text-sm space-y-2">
            <div>
              <strong className="text-gray-600 dark:text-gray-400">Wallet ID:</strong>
              <div className="font-mono text-xs mt-1">{utxo.walletId}</div>
            </div>
            <div>
              <strong className="text-gray-600 dark:text-gray-400">Last Synced:</strong>
              <div className="mt-1">
                {formatTimeSince(utxo.lastSynced)} • {new Date(utxo.lastSynced).toLocaleString()}
              </div>
            </div>
            <div className="text-xs text-gray-500 italic">Data from IndexedDB cache (synced with Blockfrost API)</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-md font-semibold mb-3 text-gray-900 dark:text-gray-100">Navigation</h3>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/wallet/${wallet.id}/utxos`}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition">
              Back to UTXOs
            </Link>
            <Link
              to={`/wallet/${wallet.id}/enhanced-transactions`}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition">
              View Transactions
            </Link>
            <Link
              to={`/wallet/${wallet.id}/assets`}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition">
              Wallet Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UTXODetail;
