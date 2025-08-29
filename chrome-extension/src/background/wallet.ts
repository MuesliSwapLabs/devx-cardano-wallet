import { walletsStorage, transactionsStorage, settingsStorage } from '@extension/storage';
import { createNewWallet, importWallet, spoofWallet } from '@extension/wallet-manager';
import { decrypt, encrypt } from '@extension/shared';
import type { Wallet } from '@extension/shared';
import type { Transaction, TransactionInput, TransactionOutput, UTXO } from '@extension/storage';
// Crypto operations moved to frontend - no longer needed in background

// Blockfrost API configuration
const BLOCKFROST_API_URLS = {
  Mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0',
  Preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
};

export const handleWalletMessages = async (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
): Promise<boolean> => {
  try {
    const walletsData = await walletsStorage.get();
    const findWallet = (id: string): Wallet | undefined => walletsData.wallets.find((w: Wallet) => w.id === id);

    switch (message.type) {
      case 'CREATE_WALLET': {
        // Receive complete data from frontend - crypto operations already done in popup
        const { name, network, password, seedPhrase, address, stakeAddress, rootKey } = message.payload;

        const wallet = await createNewWallet(name, network, password, seedPhrase, address, stakeAddress, rootKey);
        await walletsStorage.addWallet(wallet);
        sendResponse({ success: true, wallet });
        return true;
      }

      case 'IMPORT_WALLET': {
        // Receive complete data from frontend - crypto operations already done in popup
        const { name, network, seedPhrase, address, stakeAddress, password, rootKey } = message.payload;

        const wallet = await importWallet(name, network, seedPhrase, password, address, stakeAddress, rootKey);
        await walletsStorage.addWallet(wallet);
        sendResponse({ success: true, wallet });
        return true;
      }

      case 'SPOOF_WALLET': {
        try {
          const { address, name, network } = message.payload;
          const newWallet = await spoofWallet(name, address, network);
          console.log('adding Spoofed wallet:', newWallet);
          await walletsStorage.addWallet(newWallet);
          sendResponse({ success: true, payload: newWallet });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'An unknown error occurred.',
          });
        }
        return true;
      }

      case 'WALLET_RENAME': {
        await walletsStorage.updateWallet(message.payload.id, { name: message.payload.name });
        sendResponse({ success: true });
        return true;
      }

      case 'VALIDATE_PASSWORD': {
        const wallet = findWallet(message.payload.id);
        if (!wallet || !wallet.seedPhrase) throw new Error('Wallet not found or has no seedPhrase.');
        try {
          await decrypt(wallet.seedPhrase, message.payload.password);
          sendResponse({ success: true, isValid: true });
        } catch (e) {
          sendResponse({ success: true, isValid: false });
        }
        return true;
      }

      case 'ADD_PASSWORD': {
        const { id, newPassword } = message.payload;
        const wallet = findWallet(id);
        if (!wallet || wallet.hasPassword || !wallet.seedPhrase)
          throw new Error('Wallet not found, already has a password, or has no seedPhrase.');

        const newEncryptedSeedPhrase = await encrypt(wallet.seedPhrase, newPassword);
        const newEncryptedRootKey = wallet.rootKey ? await encrypt(wallet.rootKey, newPassword) : null;
        await walletsStorage.updateWallet(id, {
          seedPhrase: newEncryptedSeedPhrase,
          rootKey: newEncryptedRootKey,
          hasPassword: true,
        });
        sendResponse({ success: true });
        return true;
      }

      case 'CHANGE_PASSWORD': {
        const { id, currentPassword, newPassword } = message.payload;
        const wallet = findWallet(id);
        if (!wallet || !wallet.seedPhrase) throw new Error('Wallet not found or has no seedPhrase.');
        const seedPhrase = await decrypt(wallet.seedPhrase, currentPassword);
        const rootKey = wallet.rootKey ? await decrypt(wallet.rootKey, currentPassword) : null;
        const newEncryptedSeedPhrase = await encrypt(seedPhrase, newPassword);
        const newEncryptedRootKey = rootKey ? await encrypt(rootKey, newPassword) : null;
        await walletsStorage.updateWallet(id, {
          seedPhrase: newEncryptedSeedPhrase,
          rootKey: newEncryptedRootKey,
        });
        sendResponse({ success: true });
        return true;
      }

      case 'GET_DECRYPTED_SECRET': {
        const wallet = findWallet(message.payload.id);
        if (!wallet || !wallet.seedPhrase) {
          throw new Error('Wallet not found or has no seedPhrase.');
        }
        let seedPhrase: string;
        if (wallet.hasPassword) {
          seedPhrase = await decrypt(wallet.seedPhrase, message.payload.password);
        } else {
          seedPhrase = wallet.seedPhrase;
        }
        sendResponse({ success: true, secret: seedPhrase });
        return true;
      }

      case 'GET_TRANSACTIONS': {
        const wallet = findWallet(message.payload.walletId);
        if (!wallet) {
          throw new Error('Wallet not found.');
        }

        try {
          const result = await performTransactionSync(wallet, (current, total, message) => {
            // Send progress updates to UI
            chrome.runtime.sendMessage({
              type: 'SYNC_PROGRESS',
              payload: {
                walletId: wallet.id,
                current,
                total,
                message: message || `Downloading transactions... ${current}/${total}`,
              },
            });
          });

          sendResponse(result);
        } catch (error) {
          console.error('Failed to fetch transactions:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transactions';
          sendResponse({ success: false, error: errorMessage });
        }
        return true;
      }

      case 'GET_UTXO_DETAILS': {
        const { txHash, outputIndex } = message.payload;

        try {
          const utxo = await transactionsStorage.getUTXO(txHash, outputIndex);
          if (!utxo) {
            sendResponse({ success: false, error: 'UTXO not found' });
            return true;
          }
          sendResponse({ success: true, utxo });
        } catch (error) {
          console.error('Failed to fetch UTXO details:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch UTXO details';
          sendResponse({ success: false, error: errorMessage });
        }
        return true;
      }

      default:
        // Not a wallet message, let other handlers deal with it
        return false;
    }
  } catch (error) {
    console.error(`Error handling wallet message type ${message.type}:`, error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' });
    return true;
  }
};

// Helper function to get API config for a wallet
async function getApiConfig(wallet: Wallet) {
  const settings = await settingsStorage.get();
  const apiUrl = BLOCKFROST_API_URLS[wallet.network];
  const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

  if (!apiUrl || !apiKey) {
    throw new Error(
      `API configuration missing for ${wallet.network}. Please configure your Blockfrost API key in Settings.`,
    );
  }

  return { apiUrl, apiKey };
}

// Get payment addresses for a stake address
async function getPaymentAddresses(apiUrl: string, apiKey: string, stakeAddress: string): Promise<string[]> {
  const response = await fetch(`${apiUrl}/accounts/${stakeAddress}/addresses`, {
    headers: { project_id: apiKey },
  });

  if (!response.ok) {
    if (response.status === 404) {
      // Stake address has no payment addresses yet - return empty array
      return [];
    }
    throw new Error(`Failed to fetch payment addresses: ${response.statusText}`);
  }

  const data: { address: string }[] = await response.json();
  return data.map(item => item.address);
}

// Main sync function
async function performTransactionSync(
  wallet: Wallet,
  onProgress?: (current: number, total: number, message?: string) => void,
) {
  const settings = await settingsStorage.get();
  const lastBlock = settings.lastSyncBlock?.[wallet.id] || 0;

  // Get API config
  const { apiUrl, apiKey } = await getApiConfig(wallet);

  // Get payment addresses
  const paymentAddresses = await getPaymentAddresses(apiUrl, apiKey, wallet.stakeAddress);

  if (paymentAddresses.length === 0) {
    // No addresses yet - return empty result
    return {
      success: true,
      transactions: [],
      utxos: [],
    };
  }

  // Fetch all transaction hashes
  const allTransactionHashes = new Set<string>();
  let totalTxCount = 0;

  for (const address of paymentAddresses) {
    let url = `${apiUrl}/addresses/${address}/transactions?order=asc&count=100`;
    if (lastBlock > 0) {
      url += `&from=${lastBlock + 1}`;
    }

    // Paginate through all transactions
    let page = 1;
    while (true) {
      const pageUrl = url + `&page=${page}`;
      const response = await fetch(pageUrl, { headers: { project_id: apiKey } });

      if (!response.ok) {
        if (response.status === 404) break; // No more transactions
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const txs: Array<{ tx_hash: string; block_height: number }> = await response.json();
      if (txs.length === 0) break;

      txs.forEach(tx => allTransactionHashes.add(tx.tx_hash));
      totalTxCount = allTransactionHashes.size;

      if (txs.length < 100) break; // Last page
      page++;
    }
  }

  // Fetch transaction details
  const transactions: Transaction[] = [];
  let highestBlock = lastBlock;
  let processedCount = 0;

  for (const txHash of Array.from(allTransactionHashes)) {
    processedCount++;
    if (onProgress) {
      onProgress(processedCount, totalTxCount, `Fetching transaction ${processedCount}/${totalTxCount}`);
    }

    // Fetch transaction details AND UTXO data
    const [txResponse, utxosResponse] = await Promise.all([
      fetch(`${apiUrl}/txs/${txHash}`, { headers: { project_id: apiKey } }),
      fetch(`${apiUrl}/txs/${txHash}/utxos`, { headers: { project_id: apiKey } }),
    ]);

    if (!txResponse.ok) {
      console.warn(`Failed to fetch transaction ${txHash}: ${txResponse.statusText}`);
      continue;
    }

    if (!utxosResponse.ok) {
      console.warn(`Failed to fetch UTXOs for transaction ${txHash}: ${utxosResponse.statusText}`);
      continue;
    }

    const [txData, utxoData] = await Promise.all([txResponse.json(), utxosResponse.json()]);

    const transaction: Transaction = {
      ...txData,
      inputs: utxoData.inputs || [],
      outputs: utxoData.outputs || [],
    };

    transactions.push(transaction);
    highestBlock = Math.max(highestBlock, transaction.block_height);
  }

  // Store all wallet transactions
  await transactionsStorage.storeTransactions(wallet.id, transactions);

  // Check existing UTXO database to avoid redundant fetches
  const existingUTXOs = await transactionsStorage.getWalletUTXOs(wallet.id);
  const existingUTXOMap = new Map<string, UTXO>();
  for (const utxo of existingUTXOs) {
    existingUTXOMap.set(`${utxo.tx_hash}:${utxo.output_index}`, utxo);
  }

  // Identify missing UTXOs from inputs that need complete data
  const missingUTXOs = new Map<string, { tx_hash: string; output_index: number; needed_by: Set<string> }>();

  for (const tx of transactions) {
    for (const input of tx.inputs || []) {
      const utxoKey = `${input.tx_hash}:${input.output_index}`;

      // Check if we already have this UTXO in our database
      if (!existingUTXOMap.has(utxoKey)) {
        // Check if this UTXO is created by one of our wallet transactions
        const isFromWalletTx = transactions.some(t => t.hash === input.tx_hash);

        if (!isFromWalletTx) {
          // We need to fetch this external UTXO's complete data
          if (!missingUTXOs.has(utxoKey)) {
            missingUTXOs.set(utxoKey, {
              tx_hash: input.tx_hash,
              output_index: input.output_index,
              needed_by: new Set([tx.hash]),
            });
          } else {
            missingUTXOs.get(utxoKey)!.needed_by.add(tx.hash);
          }
        }
      }
    }
  }

  // Fetch complete data for missing UTXOs (hybrid approach)
  const externalUTXOs: UTXO[] = [];
  if (missingUTXOs.size > 0) {
    if (onProgress) {
      onProgress(totalTxCount, totalTxCount, `Fetching ${missingUTXOs.size} missing UTXO details...`);
    }

    // Group by transaction to minimize API calls
    const txToFetch = new Map<string, number[]>();
    for (const [_, utxoInfo] of Array.from(missingUTXOs)) {
      if (!txToFetch.has(utxoInfo.tx_hash)) {
        txToFetch.set(utxoInfo.tx_hash, []);
      }
      txToFetch.get(utxoInfo.tx_hash)!.push(utxoInfo.output_index);
    }

    // Fetch each external transaction's UTXO data
    for (const [txHash, outputIndexes] of Array.from(txToFetch)) {
      try {
        const utxosResponse = await fetch(`${apiUrl}/txs/${txHash}/utxos`, {
          headers: { project_id: apiKey },
        });

        if (utxosResponse.ok) {
          const utxoData = await utxosResponse.json();

          // Extract only the outputs we need
          for (const outputIndex of outputIndexes) {
            const output = utxoData.outputs?.[outputIndex];
            if (output) {
              // Find which transaction(s) spent this UTXO
              let spentInTx: string | null = null;
              for (const tx of transactions) {
                if (tx.inputs?.some(input => input.tx_hash === txHash && input.output_index === outputIndex)) {
                  spentInTx = tx.hash;
                  break;
                }
              }

              externalUTXOs.push({
                tx_hash: txHash,
                output_index: outputIndex,
                address: output.address,
                amount: output.amount,
                block: '', // We could fetch this but it's not critical
                data_hash: output.data_hash || null,
                inline_datum: output.inline_datum || null,
                reference_script_hash: output.reference_script_hash || null,
                isSpent: true, // If it's an input, it's spent
                spentInTx: spentInTx,
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch UTXO data for transaction ${txHash}:`, error);
      }
    }
  }

  // Build complete UTXO set from transactions with lifecycle tracking
  if (onProgress) {
    onProgress(totalTxCount, totalTxCount, 'Building UTXO lifecycle...');
  }

  const completeUTXOs: UTXO[] = [];
  const utxoMap = new Map<string, UTXO>(); // key: "tx_hash:output_index"

  // First, add all external UTXOs we found (already marked as spent)
  for (const utxo of externalUTXOs) {
    const key = `${utxo.tx_hash}:${utxo.output_index}`;
    utxoMap.set(key, utxo);
  }

  // Process all wallet transactions to build UTXO lifecycle
  for (const tx of transactions) {
    // Create UTXOs from ALL outputs (not just ones to our addresses)
    for (let outputIndex = 0; outputIndex < (tx.outputs?.length || 0); outputIndex++) {
      const output = tx.outputs![outputIndex];
      const key = `${tx.hash}:${outputIndex}`;
      const utxo: UTXO = {
        tx_hash: tx.hash,
        output_index: outputIndex,
        address: output.address,
        amount: output.amount,
        block: tx.block,
        data_hash: output.data_hash || null,
        inline_datum: output.inline_datum || null,
        reference_script_hash: output.reference_script_hash || null,
        isSpent: false, // Initially mark as unspent
        spentInTx: null,
      };
      utxoMap.set(key, utxo);
    }

    // Mark UTXOs as spent based on inputs
    for (const input of tx.inputs || []) {
      if (paymentAddresses.includes(input.address)) {
        const key = `${input.tx_hash}:${input.output_index}`;
        const existingUtxo = utxoMap.get(key);
        if (existingUtxo) {
          // Mark this UTXO as spent
          existingUtxo.isSpent = true;
          existingUtxo.spentInTx = tx.hash;
        } else {
          // This UTXO was created before our sync window but we still track it as spent
          const historicalUtxo: UTXO = {
            tx_hash: input.tx_hash,
            output_index: input.output_index,
            address: input.address,
            amount: input.amount,
            block: '', // We don't know the block
            data_hash: null,
            inline_datum: null,
            reference_script_hash: null,
            isSpent: true,
            spentInTx: tx.hash,
          };
          utxoMap.set(key, historicalUtxo);
        }
      }
    }
  }

  // Convert map to array
  completeUTXOs.push(...Array.from(utxoMap.values()));

  // Store all UTXOs with lifecycle data
  if (onProgress) {
    onProgress(totalTxCount, totalTxCount, `Storing ${completeUTXOs.length} UTXOs...`);
  }
  if (completeUTXOs.length > 0) {
    await transactionsStorage.storeUTXOs(wallet.id, completeUTXOs);
    console.log(
      `Stored ${completeUTXOs.length} UTXOs for wallet ${wallet.id} (${completeUTXOs.filter(u => !u.isSpent).length} unspent, ${completeUTXOs.filter(u => u.isSpent).length} spent)`,
    );
  }

  // Update last sync block
  if (onProgress) {
    onProgress(totalTxCount, totalTxCount, 'Updating sync status...');
  }
  await settingsStorage.set({
    ...settings,
    lastSyncBlock: {
      ...settings.lastSyncBlock,
      [wallet.id]: highestBlock,
    },
  });

  // Return all transactions from storage
  if (onProgress) {
    onProgress(totalTxCount, totalTxCount, 'Finalizing sync...');
  }
  const allStoredTransactions = await transactionsStorage.getWalletTransactions(wallet.id);
  const allUTXOs = await transactionsStorage.getWalletUTXOs(wallet.id);

  console.log(
    `Sync complete for wallet ${wallet.id}: ${allStoredTransactions.length} transactions, ${allUTXOs.length} UTXOs`,
  );

  return {
    success: true,
    transactions: allStoredTransactions,
    utxos: allUTXOs,
  };
}
