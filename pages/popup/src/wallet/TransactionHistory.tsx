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
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        // For now, skip the blockchain provider import to fix build issues
        // TODO: Re-enable once the module resolution is properly configured
        // try {
        //     const blockchainProvider = await import('@extension/blockchain-provider').catch(() => null);
        //     if (blockchainProvider?.getTransactions) {
        //         const txs = await blockchainProvider.getTransactions(wallet);
        //         setTransactions(txs);
        //         return;
        //     }
        // } catch (providerError) {
        //     console.warn('Blockchain provider not available:', providerError);
        // }

        // Fallback to mock data if provider fails
        const mockTransactions = [
          {
            hash: 'abc123def456...',
            block_time: Date.now() / 1000 - 3600,
            fees: '170000',
            block_height: 12345,
            size: 250,
            valid_contract: true,
          },
          {
            hash: 'def456ghi789...',
            block_time: Date.now() / 1000 - 7200,
            fees: '180000',
            block_height: 12344,
            size: 300,
            valid_contract: true,
          },
        ];

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTransactions(mockTransactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [wallet.address]);

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
        <h3 className="text-md font-semibold mb-2 border-b border-gray-300 dark:border-gray-600">History</h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Loading transactions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h3 className="text-md font-semibold mb-2 border-b border-gray-300 dark:border-gray-600">History</h3>
        <div className="text-red-500 text-sm mt-4">Error: {error}</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div>
        <h3 className="text-md font-semibold mb-2 border-b border-gray-300 dark:border-gray-600">History</h3>
        <p className="text-sm text-gray-400 mt-4">No transactions found for this wallet.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-md font-semibold mb-2 border-b border-gray-300 dark:border-gray-600">History</h3>
      <div className="space-y-2 mt-4">
        {transactions.map((tx, index) => (
          <div key={tx.hash || index} className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <div
              className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => toggleExpanded(tx.hash)}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Transaction</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(tx.block_time)}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">{tx.hash}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">Fee: {formatAda(tx.fees)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Block #{tx.block_height}</div>
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
                  <div className="text-gray-500">
                    <em>Currently showing mock transaction data. Real blockchain integration coming soon.</em>
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
