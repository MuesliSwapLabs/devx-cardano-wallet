import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Wallet } from '@extension/shared';
import type { TransactionRecord } from '@extension/storage';

interface TransactionDetailProps {
  tx: TransactionRecord;
  wallet: Wallet;
  formatAda: (lovelace: string) => string;
  formatDate: (timestamp: number) => string;
}

const TransactionDetail: React.FC<TransactionDetailProps> = ({ tx, wallet, formatAda, formatDate }) => {
  const [expandFromUTXOs, setExpandFromUTXOs] = useState(false);
  const [expandToUTXOs, setExpandToUTXOs] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [showCollaterals, setShowCollaterals] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const truncateWithCopy = (text: string, startChars: number = 8, endChars: number = 4) => (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs">
        {text.slice(0, startChars)}...{text.slice(-endChars)}
      </span>
      <button
        onClick={() => copyToClipboard(text)}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs"
        title="Copy full text">
        📋
      </button>
    </div>
  );

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      {/* General Info Section */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-sm mb-3 text-gray-900 dark:text-gray-100">Transaction Details</h4>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex justify-between items-center">
            <strong>Hash:</strong>
            {truncateWithCopy(tx.hash, 16, 8)}
          </div>
          <div className="flex justify-between">
            <strong>Time:</strong>
            <span>{formatDate(tx.block_time)}</span>
          </div>
          <div className="flex justify-between">
            <strong>Block:</strong>
            <span>#{tx.block_height}</span>
          </div>
          <div className="flex justify-between">
            <strong>Fee:</strong>
            <span className="text-red-600 dark:text-red-400">{formatAda(tx.fees)}</span>
          </div>
          <div className="flex justify-between">
            <strong>Size:</strong>
            <span>{tx.size} bytes</span>
          </div>
          {tx.deposit && tx.deposit !== '0' && (
            <div className="flex justify-between">
              <strong>Deposit:</strong>
              <span>{formatAda(tx.deposit)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <strong>Slot:</strong>
            <span>{tx.slot || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <strong>Index:</strong>
            <span>{tx.index || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <strong>UTXO Count:</strong>
            <span>{tx.utxo_count || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <strong>Valid Contract:</strong>
            <span>{tx.valid_contract ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <strong>Confirmations:</strong>
            <span className="text-green-600 dark:text-green-400">High</span>
          </div>
        </div>
      </div>

      {/* Filter Toggles */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={() => setShowReferences(!showReferences)}
            className={`px-3 py-1 text-xs rounded transition ${
              showReferences
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}>
            {showReferences ? 'Hide' : 'Show'} References
          </button>
          <button
            onClick={() => setShowCollaterals(!showCollaterals)}
            className={`px-3 py-1 text-xs rounded transition ${
              showCollaterals
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}>
            {showCollaterals ? 'Hide' : 'Show'} Collaterals
          </button>
        </div>
      </div>

      {/* From UTXOs Section */}
      {tx.inputs && tx.inputs.length > 0 && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-medium text-sm text-red-700 dark:text-red-300">Input UTXOs: {tx.inputs.length}</h5>
            <button
              onClick={() => setExpandFromUTXOs(!expandFromUTXOs)}
              className={`px-2 py-1 text-xs rounded transition ${
                expandFromUTXOs
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}>
              {expandFromUTXOs ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {!expandFromUTXOs ? (
            // Collapsed view - just links with tags
            <div className="space-y-1">
              {tx.inputs
                .filter(input => {
                  const hasCollateral = (input as any).collateral;
                  const hasReference = (input as any).reference;

                  // Show UTXO if:
                  // - It's not collateral AND not reference (normal UTXO)
                  // - It's collateral AND showCollaterals is true
                  // - It's reference AND showReferences is true
                  if (!hasCollateral && !hasReference) return true;
                  if (hasCollateral && !showCollaterals) return false;
                  if (hasReference && !showReferences) return false;
                  return true;
                })
                .map((input, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">#{idx + 1}:</span>
                      <Link
                        to={`/wallet/${wallet.id}/utxo/${input.tx_hash}/${input.output_index}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-mono">
                        {input.tx_hash.slice(0, 8)}...:{input.output_index}
                      </Link>
                    </div>
                    <div className="flex items-center gap-1">
                      {showCollaterals && (input as any).collateral && (
                        <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-1 py-0.5 rounded">
                          Collateral
                        </span>
                      )}
                      {showReferences && (input as any).reference && (
                        <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1 py-0.5 rounded">
                          Reference
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            // Expanded view - simple list
            <div className="space-y-3">
              {tx.inputs
                .filter(input => {
                  const hasCollateral = (input as any).collateral;
                  const hasReference = (input as any).reference;

                  // Show UTXO if:
                  // - It's not collateral AND not reference (normal UTXO)
                  // - It's collateral AND showCollaterals is true
                  // - It's reference AND showReferences is true
                  if (!hasCollateral && !hasReference) return true;
                  if (hasCollateral && !showCollaterals) return false;
                  if (hasReference && !showReferences) return false;
                  return true;
                })
                .map((input, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 p-3 rounded">
                    {/* Address and tags */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {input.address.slice(0, 12)}...{input.address.slice(-6)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(input.address)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs"
                          title="Copy address">
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {showCollaterals && (input as any).collateral && (
                          <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
                            Collateral
                          </span>
                        )}
                        {showReferences && (input as any).reference && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                            Reference
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assets list */}
                    {input.amount && (
                      <div className="space-y-1">
                        {input.amount.map((amt, amtIdx) => (
                          <div key={amtIdx} className="text-sm font-mono text-gray-600 dark:text-gray-400">
                            {amt.unit === 'lovelace' ? (
                              <div>{formatAda(amt.quantity)}</div>
                            ) : (
                              <div>
                                {parseInt(amt.quantity).toLocaleString()} {amt.unit.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* To UTXOs Section */}
      {tx.outputs && tx.outputs.length > 0 && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-medium text-sm text-green-700 dark:text-green-300">
              Output UTXOs: {tx.outputs.length}
            </h5>
            <button
              onClick={() => setExpandToUTXOs(!expandToUTXOs)}
              className={`px-2 py-1 text-xs rounded transition ${
                expandToUTXOs
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}>
              {expandToUTXOs ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {!expandToUTXOs ? (
            // Collapsed view - just links with tags
            <div className="space-y-1">
              {tx.outputs
                .filter(output => {
                  const hasCollateral = (output as any).collateral;
                  const hasReference = (output as any).reference;

                  // Show UTXO if:
                  // - It's not collateral AND not reference (normal UTXO)
                  // - It's collateral AND showCollaterals is true
                  // - It's reference AND showReferences is true
                  if (!hasCollateral && !hasReference) return true;
                  if (hasCollateral && !showCollaterals) return false;
                  if (hasReference && !showReferences) return false;
                  return true;
                })
                .map((output, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">#{idx + 1}:</span>
                      <Link
                        to={`/wallet/${wallet.id}/utxo/${tx.hash}/${output.output_index}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-mono">
                        {tx.hash.slice(0, 8)}...:{output.output_index}
                      </Link>
                    </div>
                    <div className="flex items-center gap-1">
                      {showCollaterals && (output as any).collateral && (
                        <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-1 py-0.5 rounded">
                          Collateral
                        </span>
                      )}
                      {showReferences && (output as any).reference && (
                        <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1 py-0.5 rounded">
                          Reference
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            // Expanded view - simple list
            <div className="space-y-3">
              {tx.outputs
                .filter(output => {
                  const hasCollateral = (output as any).collateral;
                  const hasReference = (output as any).reference;

                  // Show UTXO if:
                  // - It's not collateral AND not reference (normal UTXO)
                  // - It's collateral AND showCollaterals is true
                  // - It's reference AND showReferences is true
                  if (!hasCollateral && !hasReference) return true;
                  if (hasCollateral && !showCollaterals) return false;
                  if (hasReference && !showReferences) return false;
                  return true;
                })
                .map((output, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 p-3 rounded">
                    {/* Address and tags */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {output.address.slice(0, 12)}...{output.address.slice(-6)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(output.address)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs"
                          title="Copy address">
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {showCollaterals && (output as any).collateral && (
                          <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
                            Collateral
                          </span>
                        )}
                        {showReferences && (output as any).reference && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                            Reference
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assets list */}
                    {output.amount && (
                      <div className="space-y-1">
                        {output.amount.map((amt, amtIdx) => (
                          <div key={amtIdx} className="text-sm font-mono text-gray-600 dark:text-gray-400">
                            {amt.unit === 'lovelace' ? (
                              <div>{formatAda(amt.quantity)}</div>
                            ) : (
                              <div>
                                {parseInt(amt.quantity).toLocaleString()} {amt.unit.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Smart contract data */}
                    {((output as any).data_hash ||
                      (output as any).inline_datum ||
                      (output as any).reference_script_hash) && (
                      <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                        <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                          <strong>Smart Contract Data:</strong>
                        </div>
                        {(output as any).data_hash && (
                          <div className="text-xs">
                            <strong>Data Hash:</strong> {(output as any).data_hash.slice(0, 12)}...
                            <button
                              onClick={() => copyToClipboard((output as any).data_hash)}
                              className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              title="Copy data hash">
                              📋
                            </button>
                          </div>
                        )}
                        {(output as any).inline_datum && (
                          <div className="text-xs">
                            <strong>Inline Datum:</strong> {(output as any).inline_datum.slice(0, 20)}...
                            <button
                              onClick={() => copyToClipboard((output as any).inline_datum)}
                              className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              title="Copy inline datum">
                              📋
                            </button>
                          </div>
                        )}
                        {(output as any).reference_script_hash && (
                          <div className="text-xs">
                            <strong>Reference Script:</strong> {(output as any).reference_script_hash.slice(0, 12)}...
                            <button
                              onClick={() => copyToClipboard((output as any).reference_script_hash)}
                              className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              title="Copy reference script hash">
                              📋
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Withdrawals Section */}
      {tx.withdrawal_count > 0 && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <h5 className="font-medium text-sm text-orange-700 dark:text-orange-300 mb-2">
            Withdrawals: {tx.withdrawal_count}
          </h5>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Reward withdrawals detected in this transaction
          </div>
        </div>
      )}

      {/* Metadata Section */}
      <div className="p-3">
        <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Metadata</h5>
        <div className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded border max-h-32 overflow-y-auto">
          {/* Show actual transaction metadata if available */}
          {(tx as any).metadata ? (
            <pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify((tx as any).metadata, null, 2)}</pre>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 italic">No metadata found for this transaction</div>
          )}
        </div>

        {/* Smart Contract Activity */}
        {(tx.asset_mint_or_burn_count > 0 || tx.redeemer_count > 0) && (
          <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded">
            <div className="text-purple-700 dark:text-purple-300 text-xs">
              <strong>Smart Contract Activity:</strong>
              <div className="mt-1 space-y-1">
                {tx.asset_mint_or_burn_count > 0 && <div>Asset Mint/Burn: {tx.asset_mint_or_burn_count}</div>}
                {tx.redeemer_count > 0 && <div>Script Redeemers: {tx.redeemer_count}</div>}
              </div>
            </div>
          </div>
        )}

        <div className="text-gray-500 dark:text-gray-400 text-xs mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
          <em>Data from IndexedDB cache (synced with Blockfrost API)</em>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetail;
