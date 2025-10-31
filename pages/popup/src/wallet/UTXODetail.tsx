import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { devxData, devxSettings } from '@extension/storage';
import type { Wallet } from '@extension/shared';
import type { TransactionRecord } from '@extension/storage';
import type { TransactionOutputUTXO, AssetInfo } from '@extension/shared/lib/types/blockfrost';
import { TruncateWithCopy } from '@extension/shared';
import { BlockfrostClient } from '@extension/cardano-provider/lib/client/blockfrost';

const UTXODetail: React.FC = () => {
  const { walletId, txHash, outputIndex } = useParams<{ walletId: string; txHash: string; outputIndex: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [utxo, setUtxo] = useState<TransactionOutputUTXO | null>(null);
  const [creatingTransaction, setCreatingTransaction] = useState<TransactionRecord | null>(null);
  const [spendingTransaction, setSpendingTransaction] = useState<TransactionRecord | null>(null);
  const [assetDetails, setAssetDetails] = useState<{ [unit: string]: AssetInfo }>({});

  const decodeAssetName = (hex: string): string | null => {
    if (!hex) return null;
    try {
      const bytes: number[] = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
      }
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const decoded = decoder.decode(new Uint8Array(bytes));
      const trimmed = decoded.trim();
      return trimmed ? trimmed : null;
    } catch (e) {
      return null;
    }
  };

  const getUnitDetails = async (unit: string, client: BlockfrostClient) => {
    if (unit === 'lovelace' || !unit || assetDetails[unit]) {
      return assetDetails[unit];
    }

    try {
      const data = await client.getAssetInfo(unit);
      setAssetDetails(prev => ({ ...prev, [unit]: data }));
      return data;
    } catch (err) {
      console.error('Failed to fetch asset details:', err);
      // Return minimal data on error
      const fallback: AssetInfo = {
        asset: unit,
        policy_id: unit.slice(0, 56),
        asset_name: '',
        fingerprint: '',
        quantity: '0',
        initial_mint_tx_hash: '',
        mint_or_burn_count: 0,
        onchain_metadata: null,
        onchain_metadata_standard: null,
        onchain_metadata_extra: null,
        metadata: { decimals: 0 },
      };
      setAssetDetails(prev => ({ ...prev, [unit]: fallback }));
      return fallback;
    }
  };

  useEffect(() => {
    const fetchUTXODetails = async () => {
      if (!walletId || !txHash || !outputIndex) {
        setError('Invalid UTXO reference');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch wallet from devxData
        const walletRecord = await devxData.getWallet(walletId);
        if (!walletRecord) {
          setError('Wallet not found');
          setLoading(false);
          return;
        }
        setWallet(walletRecord);

        // Fetch settings to get API key
        const settings = await devxSettings.get();
        const apiKey = walletRecord.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

        if (!apiKey) {
          setError(`${walletRecord.network} API key not configured`);
          setLoading(false);
          return;
        }

        // Create Blockfrost client
        const client = new BlockfrostClient({
          network: walletRecord.network,
          apiKey,
        });

        // Fetch transaction UTXOs from Blockfrost
        const txUTXOs = await client.getTransactionUTXOs(txHash);

        // Find the specific output by index
        const output = txUTXOs.outputs.find(o => o.output_index === parseInt(outputIndex));
        if (!output) {
          setError(`Output index ${outputIndex} not found in transaction`);
          setLoading(false);
          return;
        }

        setUtxo(output);

        // Fetch creating transaction from devxData
        const creatingTx = await devxData.getTransaction(walletId, txHash);
        if (creatingTx) {
          setCreatingTransaction(creatingTx);
        }

        // Fetch spending transaction if UTXO is spent
        if (output.consumed_by_tx) {
          const spendingTx = await devxData.getTransaction(walletId, output.consumed_by_tx);
          if (spendingTx) {
            setSpendingTransaction(spendingTx);
          }
        }

        // Fetch asset details for non-lovelace assets
        const otherAssets = output.amount.filter(a => a.unit !== 'lovelace');
        for (const asset of otherAssets) {
          await getUnitDetails(asset.unit, client);
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch UTXO details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch UTXO details');
        setLoading(false);
      }
    };

    fetchUTXODetails();
  }, [walletId, txHash, outputIndex]);

  const formatAda = (lovelace: string) => {
    return (parseInt(lovelace) / 1000000).toFixed(6) + ' ADA';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-4">
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
        <div className="text-sm text-red-500">{error || (!wallet ? 'Wallet not found' : 'UTXO not found')}</div>
      </div>
    );
  }

  const adaAmount = utxo.amount.find(a => a.unit === 'lovelace');
  const otherAssets = utxo.amount.filter(a => a.unit !== 'lovelace');
  const isSpent = !!utxo.consumed_by_tx;

  return (
    <div className="mx-auto max-w-2xl p-4">
      {/* Header */}
      <div className="relative mb-6 flex items-center justify-center">
        <h2 className="text-lg font-semibold">UTXO Details</h2>
        <div className="absolute right-0 flex items-center gap-2">
          <div
            className={`rounded-full px-3 py-1 text-sm ${
              isSpent
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
            {isSpent ? 'Spent' : 'Unspent'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Basic Information */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h3 className="mb-3 text-base font-bold text-gray-900 dark:text-white">Basic Information</h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <strong className="text-gray-600 dark:text-gray-400">Transaction Hash:</strong>
              <TruncateWithCopy text={txHash!} maxChars={10} />
            </div>
            <div className="flex items-center justify-between">
              <strong className="text-gray-600 dark:text-gray-400">Output Index:</strong>
              <div>{utxo.output_index}</div>
            </div>
            <div className="flex items-center justify-between">
              <strong className="text-gray-600 dark:text-gray-400">Address:</strong>
              <TruncateWithCopy text={utxo.address} maxChars={10} />
            </div>
          </div>
        </div>

        {/* Value Information */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h3 className="mb-3 text-base font-bold text-gray-900 dark:text-white">Value</h3>
          <div className="space-y-3">
            {/* ADA Amount */}
            {adaAmount && (
              <div className="rounded bg-blue-50 p-3 dark:bg-blue-900/30">
                <div className="flex flex-col items-center">
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {formatAda(adaAmount.quantity)}
                  </div>
                  <div className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                    {parseInt(adaAmount.quantity).toLocaleString()} Lovelace
                  </div>
                </div>
              </div>
            )}

            {/* Other Assets */}
            {otherAssets.length > 0 && (
              <div>
                <h4 className="mb-2 text-base font-bold text-gray-900 dark:text-white">
                  Native Tokens ({otherAssets.length})
                </h4>
                <div className="space-y-2">
                  {otherAssets.map((asset, idx) => {
                    const details = assetDetails[asset.unit];
                    const assetNameHex = details?.asset_name || '';
                    const decodedName = decodeAssetName(assetNameHex);
                    const metadata = details?.metadata || {};
                    const decimals = metadata.decimals || 0;
                    const rawQuantity = parseInt(asset.quantity);
                    let formattedQuantity: string;
                    if (decimals > 0) {
                      formattedQuantity = (rawQuantity / Math.pow(10, decimals)).toFixed(decimals);
                    } else {
                      formattedQuantity = rawQuantity.toLocaleString();
                    }
                    const hexStringToShow = assetNameHex || asset.unit.slice(56);

                    return (
                      <div key={idx} className="rounded bg-purple-50 p-3 dark:bg-purple-900/30">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Asset Name:</span>
                            <TruncateWithCopy text={hexStringToShow} maxChars={10} />
                          </div>
                          {decodedName && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Asset Name Decoded:</span>
                              <span className="font-medium text-purple-900 dark:text-purple-100">{decodedName}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                            <span className="font-medium text-purple-900 dark:text-purple-100">
                              {formattedQuantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Technical Details */}
        {(utxo.data_hash || utxo.inline_datum || utxo.reference_script_hash) && (
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <h3 className="mb-3 text-base font-bold text-gray-900 dark:text-white">Technical Details</h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              {utxo.data_hash && (
                <div className="flex items-center justify-between">
                  <strong className="text-gray-600 dark:text-gray-400">Data Hash:</strong>
                  <TruncateWithCopy text={utxo.data_hash} maxChars={10} />
                </div>
              )}
              {utxo.inline_datum && (
                <div className="flex items-center justify-between">
                  <strong className="text-gray-600 dark:text-gray-400">Inline Datum:</strong>
                  <TruncateWithCopy text={utxo.inline_datum} maxChars={10} />
                </div>
              )}
              {utxo.reference_script_hash && (
                <div className="flex items-center justify-between">
                  <strong className="text-gray-600 dark:text-gray-400">Reference Script Hash:</strong>
                  <TruncateWithCopy text={utxo.reference_script_hash} maxChars={10} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction Information */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h3 className="mb-3 text-base font-bold text-gray-900 dark:text-white">Transactions</h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            {/* Creating Transaction */}
            <div className="border-l-4 border-green-500 pl-4">
              <div className="mb-2 text-left">
                <strong className="text-green-700 dark:text-green-300">Created by Transaction:</strong>
              </div>
              {creatingTransaction ? (
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Hash:</span>
                    <TruncateWithCopy text={txHash!} maxChars={10} />
                  </div>
                  <div className="flex justify-between">
                    <span>Timestamp:</span>
                    <span>{formatDate(creatingTransaction.block_time)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Block:</span>
                    <TruncateWithCopy text={`#${creatingTransaction.block_height}`} maxChars={15} />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Transaction details not available in wallet history
                </div>
              )}
            </div>

            {/* Spending Transaction */}
            {isSpent && utxo.consumed_by_tx && (
              <div className="border-l-4 border-red-500 pl-4">
                <div className="mb-2 text-left">
                  <strong className="text-red-700 dark:text-red-300">Spent by Transaction:</strong>
                </div>
                {spendingTransaction ? (
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Hash:</span>
                      <TruncateWithCopy text={utxo.consumed_by_tx} maxChars={10} />
                    </div>
                    <div className="flex justify-between">
                      <span>Timestamp:</span>
                      <span>{formatDate(spendingTransaction.block_time)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Block:</span>
                      <TruncateWithCopy text={`#${spendingTransaction.block_height}`} maxChars={15} />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Transaction details not available in wallet history
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UTXODetail;
