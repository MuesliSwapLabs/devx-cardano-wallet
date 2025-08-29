import React, { useState, useEffect } from 'react';
import type { Wallet } from '@extension/shared';

interface TransactionHistoryProps {
  wallet: Wallet;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ wallet }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = () => {
      setLoading(true);
      setError(null);

      // Fetch transactions via background service (more reliable)
      chrome.runtime.sendMessage(
        {
          type: 'GET_TRANSACTIONS',
          payload: { walletId: wallet.id },
        },
        response => {
          if (response?.success) {
            setTransactions(response.transactions || []);
          } else {
            console.error('Failed to fetch transactions:', response?.error);
            // Check if it's an API key error
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

    fetchTransactions();
  }, [wallet.id]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAda = (lovelace: string) => {
    return (parseInt(lovelace) / 1000000).toFixed(6) + ' ADA';
  };

  const toggleExpanded = (txHash: string) => {
    setExpandedTx(expandedTx === txHash ? null : txHash);
  };

  if (loading) {
    return (
      <div>
        <h3 className="text-md mb-2 border-b border-gray-300 font-semibold dark:border-gray-600">History</h3>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="size-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
            <span>Fetching all transactions...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h3 className="text-md mb-2 border-b border-gray-300 font-semibold dark:border-gray-600">History</h3>
        <div className="mt-4 text-sm text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div>
        <h3 className="text-md mb-2 border-b border-gray-300 font-semibold dark:border-gray-600">History</h3>
        <p className="mt-4 text-sm text-gray-400">No transactions found for this wallet.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-md mb-2 border-b border-gray-300 font-semibold dark:border-gray-600">History</h3>
      <div className="mt-4 space-y-2">
        {transactions.map((tx, index) => (
          <div key={tx.hash || index} className="rounded-lg border border-gray-200 dark:border-gray-700">
            <div
              className="cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => toggleExpanded(tx.hash)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Transaction</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(tx.block_time)}</div>
                  <div className="mt-1 font-mono text-xs text-gray-400 dark:text-gray-500">{tx.hash}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">Fee: {formatAda(tx.fees)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Block #{tx.block_height}</div>
                </div>
              </div>
            </div>

            {expandedTx === tx.hash && (
              <div className="border-t border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="space-y-3 text-xs">
                  <div>
                    <strong>Hash:</strong>
                    <span className="ml-2 break-all font-mono">{tx.hash}</span>
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
                  <div className="text-gray-500">
                    <em>Transaction data from Blockfrost API</em>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionHistory;
