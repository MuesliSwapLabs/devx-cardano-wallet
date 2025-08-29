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
          payload: { txHash, outputIndex: parseInt(outputIndex), walletId: wallet.id },
        },
        response => {
          if (response?.success) {
            setUtxo(response.utxo);

            // Fetch creating transaction details
            chrome.runtime.sendMessage(
              {
                type: 'GET_TRANSACTIONS',
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
        <div className="mb-4 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            ← Back
          </button>
          <h2 className="text-lg font-semibold">UTXO Details</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="size-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
            <span>Loading UTXO details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !utxo || !wallet) {
    return (
      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            ← Back
          </button>
          <h2 className="text-lg font-semibold">UTXO Details</h2>
        </div>
        <div className="text-sm text-red-500">{error || (!wallet ? 'Wallet not found' : 'UTXO not found')}</div>
      </div>
    );
  }

  const adaAmount = utxo.amount.find(a => a.unit === 'lovelace');
  const otherAssets = utxo.amount.filter(a => a.unit !== 'lovelace');

  return (
    <div className="mx-auto max-w-2xl p-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          ← Back
        </button>
        <h2 className="text-lg font-semibold">UTXO Details</h2>
        <div className="ml-auto flex items-center gap-2">
          {utxo.isExternal && (
            <div className="rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              External
            </div>
          )}
          <div
            className={`rounded-full px-3 py-1 text-sm ${
              utxo.isSpent
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
            {utxo.isSpent ? 'Spent' : 'Unspent'}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h3 className="text-md mb-3 font-semibold text-gray-900 dark:text-gray-100">Basic Information</h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <strong className="text-gray-600 dark:text-gray-400">Transaction Hash:</strong>
              <div className="mt-1 break-all rounded bg-white p-2 font-mono text-xs dark:bg-gray-900">
                {utxo.tx_hash}
              </div>
            </div>
            <div>
              <strong className="text-gray-600 dark:text-gray-400">Output Index:</strong>
              <div className="mt-1">{utxo.output_index}</div>
            </div>
            <div>
              <strong className="text-gray-600 dark:text-gray-400">Address:</strong>
              <div className="mt-1 break-all rounded bg-white p-2 font-mono text-xs dark:bg-gray-900">
                {utxo.address}
              </div>
            </div>
            <div>
              <strong className="text-gray-600 dark:text-gray-400">Block:</strong>
              <div className="mt-1">{utxo.block}</div>
            </div>
          </div>
        </div>

        {/* External UTXO Information */}
        {utxo.isExternal && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-900/30">
            <h3 className="text-md mb-3 flex items-center gap-2 font-semibold text-orange-900 dark:text-orange-100">
              ⚠️ External UTXO
            </h3>
            <div className="space-y-3 text-sm">
              <div className="text-orange-800 dark:text-orange-200">
                This UTXO belongs to an external address, not your wallet. It appears in your transaction history
                because it was either an input to a transaction that involved your wallet, or an output that went to an
                external address.
              </div>
              {utxo.ownerAddress && (
                <div>
                  <strong className="text-orange-700 dark:text-orange-300">Owner Address:</strong>
                  <div className="mt-1 break-all rounded border border-orange-200 bg-white p-2 font-mono text-xs dark:border-orange-600 dark:bg-gray-900">
                    {utxo.ownerAddress}
                  </div>
                </div>
              )}
              <div className="text-xs italic text-orange-700 dark:text-orange-400">
                External UTXOs are tracked for transaction completeness but do not belong to your wallet.
              </div>
            </div>
          </div>
        )}

        {/* Value Information */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h3 className="text-md mb-3 font-semibold text-gray-900 dark:text-gray-100">Value</h3>
          <div className="space-y-3">
            {/* ADA Amount */}
            {adaAmount && (
              <div className="rounded bg-blue-50 p-3 dark:bg-blue-900/30">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-blue-900 dark:text-blue-100">Cardano (ADA)</div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {formatAda(adaAmount.quantity)}
                  </div>
                </div>
                <div className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                  {parseInt(adaAmount.quantity).toLocaleString()} Lovelace
                </div>
              </div>
            )}

            {/* Other Assets */}
            {otherAssets.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Native Assets ({otherAssets.length})
                </div>
                <div className="space-y-2">
                  {otherAssets.map((asset, idx) => (
                    <div key={idx} className="rounded bg-purple-50 p-3 dark:bg-purple-900/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-purple-900 dark:text-purple-100">Native Asset</div>
                          <div className="mt-1 break-all font-mono text-xs text-purple-700 dark:text-purple-300">
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
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <h3 className="text-md mb-3 font-semibold text-gray-900 dark:text-gray-100">Technical Details</h3>
            <div className="space-y-3 text-sm">
              {utxo.data_hash && (
                <div>
                  <strong className="text-gray-600 dark:text-gray-400">Data Hash:</strong>
                  <div className="mt-1 break-all rounded bg-white p-2 font-mono text-xs dark:bg-gray-900">
                    {utxo.data_hash}
                  </div>
                </div>
              )}
              {utxo.inline_datum && (
                <div>
                  <strong className="text-gray-600 dark:text-gray-400">Inline Datum:</strong>
                  <div className="mt-1 max-h-32 overflow-y-auto break-all rounded bg-white p-2 font-mono text-xs dark:bg-gray-900">
                    {utxo.inline_datum}
                  </div>
                </div>
              )}
              {utxo.reference_script_hash && (
                <div>
                  <strong className="text-gray-600 dark:text-gray-400">Reference Script Hash:</strong>
                  <div className="mt-1 break-all rounded bg-white p-2 font-mono text-xs dark:bg-gray-900">
                    {utxo.reference_script_hash}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction Information */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h3 className="text-md mb-3 font-semibold text-gray-900 dark:text-gray-100">Transaction History</h3>
          <div className="space-y-4">
            {/* Creating Transaction */}
            <div className="border-l-4 border-green-500 pl-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-green-700 dark:text-green-300">Created by Transaction</h4>
                  {creatingTransaction && (
                    <div className="mt-1 text-xs text-gray-500">
                      {formatDate(creatingTransaction.block_time)} • Block #{creatingTransaction.block_height}
                    </div>
                  )}
                </div>
                <Link
                  to={`/wallet/${wallet.id}/transactions`}
                  className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                  View in Transactions
                </Link>
              </div>
              <div className="break-all rounded bg-white p-2 font-mono text-xs dark:bg-gray-900">{utxo.tx_hash}</div>
            </div>

            {/* Spending Transaction */}
            {utxo.isSpent && utxo.spentInTx && (
              <div className="border-l-4 border-red-500 pl-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-red-700 dark:text-red-300">Spent by Transaction</h4>
                    {spendingTransaction && (
                      <div className="mt-1 text-xs text-gray-500">
                        {formatDate(spendingTransaction.block_time)} • Block #{spendingTransaction.block_height}
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/wallet/${wallet.id}/transactions`}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                    View in Transactions
                  </Link>
                </div>
                <div className="break-all rounded bg-white p-2 font-mono text-xs dark:bg-gray-900">
                  {utxo.spentInTx}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cache Information */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h3 className="text-md mb-3 font-semibold text-gray-900 dark:text-gray-100">Cache Information</h3>
          <div className="space-y-2 text-sm">
            <div>
              <strong className="text-gray-600 dark:text-gray-400">Wallet ID:</strong>
              <div className="mt-1 font-mono text-xs">{utxo.walletId}</div>
            </div>
            <div>
              <strong className="text-gray-600 dark:text-gray-400">Last Synced:</strong>
              <div className="mt-1">
                {formatTimeSince(utxo.lastSynced)} • {new Date(utxo.lastSynced).toLocaleString()}
              </div>
            </div>
            <div className="text-xs italic text-gray-500">Data from IndexedDB cache (synced with Blockfrost API)</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h3 className="text-md mb-3 font-semibold text-gray-900 dark:text-gray-100">Navigation</h3>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/wallet/${wallet.id}/utxos`}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white transition hover:bg-blue-700">
              Back to UTXOs
            </Link>
            <Link
              to={`/wallet/${wallet.id}/transactions`}
              className="rounded bg-purple-600 px-3 py-1 text-sm text-white transition hover:bg-purple-700">
              View Transactions
            </Link>
            <Link
              to={`/wallet/${wallet.id}/assets`}
              className="rounded bg-gray-600 px-3 py-1 text-sm text-white transition hover:bg-gray-700">
              Wallet Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UTXODetail;
