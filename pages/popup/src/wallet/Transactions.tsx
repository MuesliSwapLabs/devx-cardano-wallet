import React, { useState, useEffect, useMemo } from 'react';
import type { UTXORecord, TransactionRecord, WalletRecord } from '@extension/storage';
import { TruncateWithCopy } from '@extension/shared';
import TransactionDetail from './TransactionDetail';

interface TransactionsProps {
  wallet: WalletRecord;
  transactions: TransactionRecord[];
}

const Transactions: React.FC<TransactionsProps> = ({ wallet, transactions }) => {
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsToShow, setItemsToShow] = useState(10);
  const itemsPerLoad = 10;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatDateToDay = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Otherwise, return formatted date
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const groupTransactionsByDay = (transactions: TransactionRecord[]) => {
    const groups: { [key: string]: TransactionRecord[] } = {};

    transactions.forEach(tx => {
      const dayKey = formatDateToDay(tx.block_time);
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(tx);
    });

    return groups;
  };

  const formatAda = (lovelace: string) => {
    return (parseInt(lovelace) / 1000000).toFixed(6) + ' ADA';
  };

  const decodeAssetName = (unit: string): string => {
    if (unit.length <= 56) return '';
    const nameHex = unit.slice(56);
    try {
      const bytes = new Uint8Array(nameHex.length / 2);
      for (let i = 0; i < nameHex.length; i += 2) {
        bytes[i / 2] = parseInt(nameHex.substr(i, 2), 16);
      }
      let name = '';
      for (const byte of bytes) {
        if (byte === 0) break;
        name += String.fromCharCode(byte);
      }
      return name;
    } catch (e) {
      return '';
    }
  };

  const getAssetDisplay = (unit: string, qty: bigint, formatAda: (l: string) => string): string => {
    const absQty = qty < 0n ? -qty : qty;
    const sign = qty < 0n ? '-' : '+';
    let amountStr: string;
    let name: string;
    if (unit === 'lovelace') {
      amountStr = formatAda(absQty.toString());
      return `${sign}${amountStr}`;
    } else {
      const assetName = decodeAssetName(unit);
      amountStr = Number(absQty).toLocaleString();
      name = assetName || unit.slice(56, 64) || (absQty === 1n ? 'Asset' : 'Assets');
      if (absQty === 1n && assetName) {
        name = assetName;
      }
      return `${sign}${amountStr} ${name}`;
    }
  };

  const computeNetAssets = (tx: TransactionRecord): Record<string, bigint> => {
    const inputTotals: Record<string, bigint> = {};
    const outputTotals: Record<string, bigint> = {};

    // Sum up inputs from non-external addresses (our wallet)
    (tx.inputs || []).forEach(input => {
      if (!input.isExternal) {
        // Only our wallet's inputs
        input.amount.forEach(asset => {
          if (!inputTotals[asset.unit]) inputTotals[asset.unit] = 0n;
          inputTotals[asset.unit] += BigInt(asset.quantity);
        });
      }
    });

    // Sum up outputs to non-external addresses (our wallet)
    (tx.outputs || []).forEach(output => {
      if (!output.isExternal) {
        // Only our wallet's outputs
        output.amount.forEach(asset => {
          if (!outputTotals[asset.unit]) outputTotals[asset.unit] = 0n;
          outputTotals[asset.unit] += BigInt(asset.quantity);
        });
      }
    });

    // Calculate net change (output - input) for each asset
    // The fee is already reflected in this difference, so we don't subtract it separately
    const net: Record<string, bigint> = {};
    const allUnits = new Set([...Object.keys(inputTotals), ...Object.keys(outputTotals)]);

    allUnits.forEach(unit => {
      const inQty = inputTotals[unit] || 0n;
      const outQty = outputTotals[unit] || 0n;
      const netChange = outQty - inQty;

      if (netChange !== 0n) {
        net[unit] = netChange;
      }
    });

    return net;
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

  // Sort by date FIRST (newest first)
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => b.block_time - a.block_time);
  }, [filteredTransactions]);

  // THEN slice to get visible ones
  const visibleTransactions = sortedTransactions.slice(0, itemsToShow);

  // THEN group the visible ones
  const visibleGroups = groupTransactionsByDay(visibleTransactions);

  // Reset items when search changes
  useEffect(() => {
    setItemsToShow(10);
  }, [searchQuery]);

  // Handle scroll to load more
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const element = e.target as HTMLElement;
      // Check if scrolled near bottom (within 100px)
      if (element.scrollHeight - element.scrollTop <= element.clientHeight + 100) {
        if (itemsToShow < sortedTransactions.length) {
          setItemsToShow(prev => Math.min(prev + itemsPerLoad, sortedTransactions.length));
        }
      }
    };

    // Find the scrollable parent (main element with overflow-y-auto)
    const scrollableParent = document.querySelector('main.overflow-y-auto');
    if (scrollableParent) {
      scrollableParent.addEventListener('scroll', handleScroll);
      return () => scrollableParent.removeEventListener('scroll', handleScroll);
    }
    return undefined;
  }, [itemsToShow, sortedTransactions.length]);

  return (
    <div>
      <div className="mb-2 pt-4 pb-2">
        <input
          type="text"
          placeholder="Search transactions (hash, address, block, etc.)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400"
        />
      </div>

      <div className="mt-4 space-y-4">
        {filteredTransactions.length === 0 && searchQuery.trim() ? (
          <div className="py-8 text-center">
            <div className="text-sm text-gray-500">No transactions match your search for "{searchQuery}"</div>
            <button onClick={() => setSearchQuery('')} className="mt-2 text-xs text-blue-500 hover:text-blue-600">
              Clear search
            </button>
          </div>
        ) : (
          Object.entries(visibleGroups).map(([dayKey, dayTransactions]) => (
            <div key={dayKey} className="space-y-2">
              {/* Day Header */}
              <div className="sticky top-0 z-10 bg-slate-50 pb-2 dark:bg-gray-800">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{dayKey}</h4>
              </div>

              {/* Transactions for this day */}
              <div className="space-y-2">
                {dayTransactions.map((tx, index) => {
                  const netAssets = computeNetAssets(tx);
                  const sortedUnits = Object.keys(netAssets).sort((a, b) =>
                    a === 'lovelace' ? -1 : b === 'lovelace' ? 1 : 0,
                  );
                  // Check if we paid the fee (we have inputs in this transaction)
                  const wePaidFee = (tx.inputs || []).some(input => !input.isExternal);
                  return (
                    <div key={tx.hash || index} className="rounded-lg border border-gray-200 dark:border-gray-700">
                      <div
                        className="cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => toggleExpanded(tx.hash)}>
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(tx.block_time)}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">Block #{tx.block_height}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-xs text-gray-400 dark:text-gray-500">
                              <TruncateWithCopy text={tx.hash} maxChars={10} />
                            </div>
                          </div>
                        </div>
                        {Object.keys(netAssets).length > 0 && (
                          <div className="mt-1 space-y-1">
                            {sortedUnits.map(unit => {
                              const qty = netAssets[unit];
                              const colorClass =
                                qty > 0n
                                  ? 'text-green-600 dark:text-green-400'
                                  : qty < 0n
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-900 dark:text-gray-100';
                              return (
                                <div key={unit} className={`text-sm font-medium ${colorClass}`}>
                                  {getAssetDisplay(unit, qty, formatAda)}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Only show fee if we paid it */}
                        {wePaidFee && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Fee: {formatAda(tx.fees)}</div>
                        )}
                      </div>

                      {expandedTx === tx.hash && (
                        <TransactionDetail tx={tx} wallet={wallet} formatAda={formatAda} formatDate={formatDate} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {transactions.length === 0 && (
        <p className="mt-4 text-center text-sm text-gray-400">No transactions found for this wallet.</p>
      )}

      {/* Show loading indicator or count */}
      {sortedTransactions.length > 0 && (
        <div className="mt-4 pb-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {itemsToShow < sortedTransactions.length ? (
            <div>
              Showing {itemsToShow} of {sortedTransactions.length} transactions
              <div className="mt-2 text-xs">Scroll down to load more</div>
            </div>
          ) : (
            `All ${sortedTransactions.length} transactions loaded`
          )}
        </div>
      )}
    </div>
  );
};

export default Transactions;
