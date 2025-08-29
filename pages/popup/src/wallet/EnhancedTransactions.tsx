import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Wallet } from '@extension/shared';
import type { TransactionRecord } from '@extension/storage';
import TransactionDetail from './TransactionDetail';

interface EnhancedTransactionsProps {
  wallet: Wallet;
  transactions: TransactionRecord[];
  onRefresh: () => Promise<void>;
}

const EnhancedTransactions: React.FC<EnhancedTransactionsProps> = ({ wallet, transactions, onRefresh }) => {
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAda = (lovelace: string) => {
    return (parseInt(lovelace) / 1000000).toFixed(6) + ' ADA';
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

    // Note: Search in input/output addresses removed since transactions no longer include detailed I/O data

    // Search in fees
    if (tx.fees.includes(query)) return true;

    // Search in block height
    if (tx.block_height.toString().includes(query)) return true;

    return false;
  });

  return (
    <div>
      <div className="mb-2 border-b border-gray-300 pb-2 dark:border-gray-600">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-md font-semibold">Transactions</h3>
          <button onClick={onRefresh} className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600">
            Refresh
          </button>
        </div>
        <input
          type="text"
          placeholder="Search transactions (hash, address, block, etc.)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400"
        />
      </div>

      <div className="mt-4 space-y-2">
        {filteredTransactions.length === 0 && searchQuery.trim() ? (
          <div className="py-8 text-center">
            <div className="text-sm text-gray-500">No transactions match your search for "{searchQuery}"</div>
            <button onClick={() => setSearchQuery('')} className="mt-2 text-xs text-blue-500 hover:text-blue-600">
              Clear search
            </button>
          </div>
        ) : (
          filteredTransactions.map((tx, index) => (
            <div key={tx.hash || index} className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div
                className="cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => toggleExpanded(tx.hash)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Transaction</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(tx.block_time)}</div>
                    <div className="mt-1 break-all font-mono text-xs text-gray-400 dark:text-gray-500">
                      {tx.hash.slice(0, 20)}...{tx.hash.slice(-8)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Fee: {formatAda(tx.fees)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Block #{tx.block_height}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">{tx.utxo_count || 0} UTXOs</div>
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

      {transactions.length === 0 && (
        <p className="mt-4 text-center text-sm text-gray-400">No transactions found for this wallet.</p>
      )}
    </div>
  );
};

export default EnhancedTransactions;
