import {
  transactionsStorage,
  settingsStorage,
  walletsStorage,
  type TransactionRecord,
  type UTXORecord,
} from '@extension/storage';
import type { Wallet } from '@extension/shared';

interface SyncProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
}

interface SyncResult {
  success: boolean;
  newTransactions: number;
  newUTXOs: number;
  updatedUTXOs: number;
  error?: string;
  syncDuration: number;
  progress?: SyncProgress;
}

interface SyncStatus {
  isActive: boolean;
  lastSync: number;
  isStale: boolean;
  progress?: SyncProgress;
  error?: string;
}

// 5-minute cache as requested
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const MIN_SYNC_INTERVAL = 10 * 1000; // 10 seconds minimum between syncs

// Track active syncs per wallet to prevent duplicates
const activeSyncs = new Map<string, Promise<SyncResult>>();
const syncStatuses = new Map<string, SyncStatus>();

// Blockfrost API configuration
const BLOCKFROST_API_URLS = {
  Mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0',
  Preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
};

interface BlockfrostAmount {
  unit: string;
  quantity: string;
}

interface BlockfrostUTXO {
  address: string;
  tx_hash: string;
  output_index: number;
  amount: BlockfrostAmount[];
  block: string;
  data_hash?: string | null;
  inline_datum?: string | null;
  reference_script_hash?: string | null;
}

interface BlockfrostTransaction {
  hash: string;
  block: string;
  block_height: number;
  block_time: number;
  slot: number;
  index: number;
  output_amount: BlockfrostAmount[];
  fees: string;
  deposit: string;
  size: number;
  invalid_before: string | null;
  invalid_hereafter: string | null;
  utxo_count: number;
  withdrawal_count: number;
  mir_cert_count: number;
  delegation_count: number;
  stake_cert_count: number;
  pool_update_count: number;
  pool_retire_count: number;
  asset_mint_or_burn_count: number;
  redeemer_count: number;
  valid_contract: boolean;
}

interface TransactionInput {
  address: string;
  amount: BlockfrostAmount[];
  tx_hash: string;
  output_index: number;
}

interface TransactionOutput {
  address: string;
  amount: BlockfrostAmount[];
  output_index: number;
  data_hash?: string | null;
  inline_datum?: string | null;
  reference_script_hash?: string | null;
}

interface BlockfrostTransactionDetails extends BlockfrostTransaction {
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
}

export class UnifiedSyncService {
  /**
   * Main sync function - handles all wallet data synchronization
   */
  static async syncWallet(walletId: string, forceSync = false): Promise<SyncResult> {
    // Check if sync is already active
    if (activeSyncs.has(walletId)) {
      return await activeSyncs.get(walletId)!;
    }

    const syncPromise = this._performSync(walletId, forceSync);
    activeSyncs.set(walletId, syncPromise);

    try {
      return await syncPromise;
    } finally {
      activeSyncs.delete(walletId);
    }
  }

  private static async _performSync(walletId: string, forceSync: boolean): Promise<SyncResult> {
    const startTime = Date.now();
    this.updateSyncStatus(walletId, { isActive: true, lastSync: 0, isStale: false });

    try {
      // Get wallet data using walletsStorage abstraction
      const walletsData = await walletsStorage.get();
      const wallet = walletsData.wallets.find((w: Wallet) => w.id === walletId);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Check if sync is needed (5-minute cache logic)
      const lastSync = await transactionsStorage.getLastSync(walletId);
      const timeSinceLastSync = Date.now() - lastSync;
      const isStale = timeSinceLastSync > CACHE_MAX_AGE;

      if (!forceSync && !isStale && timeSinceLastSync > MIN_SYNC_INTERVAL) {
        this.updateSyncStatus(walletId, {
          isActive: false,
          lastSync,
          isStale: false,
        });

        return {
          success: true,
          newTransactions: 0,
          newUTXOs: 0,
          updatedUTXOs: 0,
          syncDuration: Date.now() - startTime,
        };
      }

      // Update progress: Starting
      this.updateProgress(walletId, 'Initializing sync...', 0, 100);

      // Get API configuration
      const { apiUrl, apiKey } = await this.getApiConfig(wallet);

      // Phase 1: Get payment addresses (10% progress)
      this.updateProgress(walletId, 'Fetching wallet addresses...', 10, 100);
      const paymentAddresses = await this.getPaymentAddresses(apiUrl, apiKey, wallet.stakeAddress);

      // Decide between full sync or incremental sync
      let transactionDetails: BlockfrostTransactionDetails[] = [];
      let latestBlock = 0;

      if (forceSync) {
        // Full sync - get all transactions
        this.updateProgress(walletId, 'Fetching complete transaction history...', 30, 100);
        const allTransactionHashes = await this.getAllTransactionHashes(apiUrl, apiKey, paymentAddresses);

        this.updateProgress(walletId, 'Fetching transaction details...', 60, 100);
        transactionDetails = await this.getTransactionDetailsInBatches(
          apiUrl,
          apiKey,
          allTransactionHashes.slice(0, 100), // Limit for performance
          (current, total) => {
            const progress = 60 + Math.floor((current / total) * 20);
            this.updateProgress(walletId, `Processing transactions... ${current}/${total}`, progress, 100);
          },
        );

        // Update latest block for future incremental syncs
        latestBlock = Math.max(...transactionDetails.map(tx => tx.block_height));
      } else {
        // Incremental sync - only get new transactions since last sync
        const lastSyncBlock = await this.getLastSyncBlock(walletId);

        this.updateProgress(walletId, `Incremental sync from block ${lastSyncBlock}...`, 30, 100);
        const incrementalResult = await this.performIncrementalSync(walletId, wallet, lastSyncBlock);

        transactionDetails = incrementalResult.newTxs;
        latestBlock = incrementalResult.latestBlock;

        if (transactionDetails.length === 0) {
          this.updateProgress(walletId, 'No new transactions found', 100, 100);

          this.updateSyncStatus(walletId, {
            isActive: false,
            lastSync: Date.now(),
            isStale: false,
          });

          return {
            success: true,
            newTransactions: 0,
            newUTXOs: 0,
            updatedUTXOs: 0,
            syncDuration: Date.now() - startTime,
          };
        }
      }

      // Phase 4: Build UTXO map with smart merging (80% progress)
      this.updateProgress(walletId, 'Building UTXO database...', 80, 100);
      const { allUTXOs, transactionRecords } = await this.buildUTXODatabase(
        transactionDetails,
        paymentAddresses,
        wallet,
      );

      // Phase 5: Smart merge with existing data (90% progress)
      this.updateProgress(walletId, 'Merging with cached data...', 90, 100);
      const mergeResult = await this.smartMergeData(walletId, transactionRecords, allUTXOs);

      // Phase 6: Complete (100% progress)
      this.updateProgress(walletId, 'Sync completed!', 100, 100);

      // Update last sync time and block
      await transactionsStorage.updateLastSync(walletId);
      if (latestBlock > 0) {
        await this.setLastSyncBlock(walletId, latestBlock);
      }

      const syncDuration = Date.now() - startTime;

      this.updateSyncStatus(walletId, {
        isActive: false,
        lastSync: Date.now(),
        isStale: false,
      });

      console.log(`✅ Unified sync completed for wallet ${walletId} in ${syncDuration}ms:`, mergeResult);

      return {
        success: true,
        syncDuration,
        ...mergeResult,
      };
    } catch (error) {
      console.error(`❌ Unified sync failed for wallet ${walletId}:`, error);

      this.updateSyncStatus(walletId, {
        isActive: false,
        lastSync: await transactionsStorage.getLastSync(walletId),
        isStale: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        newTransactions: 0,
        newUTXOs: 0,
        updatedUTXOs: 0,
        syncDuration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Smart data merging that prevents chaos
   */
  private static async smartMergeData(walletId: string, newTransactions: TransactionRecord[], newUTXOs: UTXORecord[]) {
    // Get existing data
    const [existingTxs, existingUTXOs] = await Promise.all([
      transactionsStorage.getWalletTransactions(walletId),
      transactionsStorage.getWalletUTXOs(walletId),
    ]);

    // Create lookup maps for efficient merging
    const existingTxMap = new Map(existingTxs.map(tx => [tx.hash, tx]));
    const existingUTXOMap = new Map(existingUTXOs.map(utxo => [`${utxo.tx_hash}:${utxo.output_index}`, utxo]));

    // Identify truly new transactions
    const reallyNewTxs = newTransactions.filter(tx => !existingTxMap.has(tx.hash));

    // Identify new UTXOs and updated UTXOs (spent status changes)
    const newUTXOList: UTXORecord[] = [];
    const updatedUTXOList: UTXORecord[] = [];

    for (const utxo of newUTXOs) {
      const key = `${utxo.tx_hash}:${utxo.output_index}`;
      const existing = existingUTXOMap.get(key);

      if (!existing) {
        newUTXOList.push(utxo);
      } else if (existing.isSpent !== utxo.isSpent) {
        // UTXO spending status changed - this is critical for accuracy
        updatedUTXOList.push({
          ...existing,
          isSpent: utxo.isSpent,
          spentInTx: utxo.spentInTx,
          lastSynced: Date.now(),
        });
      }
    }

    // Store new data atomically
    if (reallyNewTxs.length > 0) {
      await transactionsStorage.storeTransactions(walletId, reallyNewTxs);
    }

    if (newUTXOList.length > 0 || updatedUTXOList.length > 0) {
      const utxosToStore = [...newUTXOList, ...updatedUTXOList];
      await transactionsStorage.storeUTXOs(walletId, utxosToStore);
    }

    return {
      newTransactions: reallyNewTxs.length,
      newUTXOs: newUTXOList.length,
      updatedUTXOs: updatedUTXOList.length,
    };
  }

  /**
   * Build comprehensive UTXO database with correct spent/unspent tracking
   */
  private static async buildUTXODatabase(
    transactions: BlockfrostTransactionDetails[],
    paymentAddresses: string[],
    wallet: Wallet,
  ) {
    const utxoMap = new Map<string, UTXORecord>();
    const transactionRecords: TransactionRecord[] = [];

    // Phase 1: Create UTXOs from transaction outputs
    for (const tx of transactions) {
      // Create transaction record with proper field mapping
      transactionRecords.push({
        hash: tx.hash,
        block: tx.block,
        block_height: tx.block_height,
        block_time: tx.block_time,
        slot: tx.slot,
        index: tx.index,
        output_amount: tx.output_amount,
        fees: tx.fees,
        deposit: tx.deposit,
        size: tx.size,
        invalid_before: tx.invalid_before,
        invalid_hereafter: tx.invalid_hereafter,
        utxo_count: tx.utxo_count,
        withdrawal_count: tx.withdrawal_count,
        mir_cert_count: tx.mir_cert_count,
        delegation_count: tx.delegation_count,
        stake_cert_count: tx.stake_cert_count,
        pool_update_count: tx.pool_update_count,
        pool_retire_count: tx.pool_retire_count,
        asset_mint_or_burn_count: tx.asset_mint_or_burn_count,
        redeemer_count: tx.redeemer_count,
        valid_contract: tx.valid_contract,
        inputs: tx.inputs,
        outputs: tx.outputs,
        relatedUtxos: [], // Will be filled later if needed
        walletId: wallet.id,
        lastSynced: Date.now(),
        enhancedData: {
          inputs: tx.inputs.map(input => ({
            transaction_id: input.tx_hash,
            output_index: input.output_index,
            amount: input.amount,
            address: input.address, // Add address for search functionality
          })),
          outputs: tx.outputs.map(output => ({
            address: output.address,
            amount: output.amount,
          })),
        },
      });

      // Process outputs to create UTXOs
      tx.outputs.forEach((output, index) => {
        if (paymentAddresses.includes(output.address)) {
          const key = `${tx.hash}:${index}`;
          utxoMap.set(key, {
            tx_hash: tx.hash,
            output_index: index,
            address: output.address,
            amount: output.amount,
            block: tx.block,
            data_hash: output.data_hash,
            inline_datum: output.inline_datum,
            reference_script_hash: output.reference_script_hash,
            isSpent: false,
            spentInTx: null,
            walletId: wallet.id,
            lastSynced: Date.now(),
          });
        }
      });
    }

    // Phase 2: Mark UTXOs as spent by analyzing inputs
    for (const tx of transactions) {
      tx.inputs.forEach(input => {
        // Only process inputs that belong to our wallet
        if (paymentAddresses.includes(input.address)) {
          const key = `${input.tx_hash}:${input.output_index}`;
          const utxo = utxoMap.get(key);

          if (utxo) {
            utxo.isSpent = true;
            utxo.spentInTx = tx.hash;
          }
        }
      });
    }

    return {
      allUTXOs: Array.from(utxoMap.values()),
      transactionRecords,
    };
  }

  /**
   * Get transaction details in batches with progress reporting
   */
  private static async getTransactionDetailsInBatches(
    apiUrl: string,
    apiKey: string,
    txHashes: string[],
    onProgress?: (current: number, total: number) => void,
  ): Promise<BlockfrostTransactionDetails[]> {
    const results: BlockfrostTransactionDetails[] = [];
    const batchSize = 10; // Process 10 at a time

    for (let i = 0; i < txHashes.length; i += batchSize) {
      const batch = txHashes.slice(i, i + batchSize);

      const batchPromises = batch.map(async txHash => {
        try {
          return await this.getTransactionDetails(apiUrl, apiKey, txHash);
        } catch (error) {
          console.warn(`Failed to fetch transaction ${txHash}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((tx): tx is BlockfrostTransactionDetails => tx !== null));

      if (onProgress) {
        onProgress(i + batch.length, txHashes.length);
      }

      // Small delay between batches to be API-friendly
      if (i + batchSize < txHashes.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results.sort((a, b) => b.block_time - a.block_time);
  }

  /**
   * Incremental sync using block-based filtering for efficiency
   */
  private static async getIncrementalTransactionHashes(
    apiUrl: string,
    apiKey: string,
    addresses: string[],
    fromBlock?: number,
  ): Promise<{ hashes: string[]; latestBlock: number }> {
    const allHashes = new Set<string>();
    let latestBlock = 0;

    for (const address of addresses) {
      let url = `${apiUrl}/addresses/${address}/transactions?count=100&order=desc`;

      // Add block filtering if we have a starting point
      if (fromBlock) {
        url += `&from=${fromBlock}`;
      }

      const response = await fetch(url, { headers: { project_id: apiKey } });

      if (response.ok) {
        const data: { tx_hash: string; block_height: number }[] = await response.json();

        for (const tx of data) {
          allHashes.add(tx.tx_hash);
          latestBlock = Math.max(latestBlock, tx.block_height);
        }
      }
    }

    return {
      hashes: Array.from(allHashes),
      latestBlock,
    };
  }

  /**
   * Perform incremental sync by only fetching new data since last sync
   */
  private static async performIncrementalSync(
    walletId: string,
    wallet: Wallet,
    lastSyncBlock: number,
  ): Promise<{ newTxs: BlockfrostTransactionDetails[]; latestBlock: number }> {
    const { apiUrl, apiKey } = await this.getApiConfig(wallet);

    this.updateProgress(walletId, 'Fetching payment addresses...', 10, 100);
    const paymentAddresses = await this.getPaymentAddresses(apiUrl, apiKey, wallet.stakeAddress);

    this.updateProgress(walletId, 'Fetching new transactions since last sync...', 30, 100);
    const { hashes: newTxHashes, latestBlock } = await this.getIncrementalTransactionHashes(
      apiUrl,
      apiKey,
      paymentAddresses,
      lastSyncBlock,
    );

    if (newTxHashes.length === 0) {
      return { newTxs: [], latestBlock: lastSyncBlock };
    }

    this.updateProgress(walletId, `Processing ${newTxHashes.length} new transactions...`, 60, 100);
    const newTransactions = await this.getTransactionDetailsInBatches(apiUrl, apiKey, newTxHashes, (current, total) => {
      const progress = 60 + Math.floor((current / total) * 30);
      this.updateProgress(walletId, `Processing transactions... ${current}/${total}`, progress, 100);
    });

    return { newTxs: newTransactions, latestBlock };
  }

  /**
   * Store last sync block for incremental syncing
   */
  private static async getLastSyncBlock(walletId: string): Promise<number> {
    try {
      const result = await chrome.storage.local.get([`lastSyncBlock_${walletId}`]);
      return result[`lastSyncBlock_${walletId}`] || 0;
    } catch (error) {
      console.warn('Failed to get last sync block:', error);
      return 0;
    }
  }

  private static async setLastSyncBlock(walletId: string, block: number): Promise<void> {
    try {
      await chrome.storage.local.set({ [`lastSyncBlock_${walletId}`]: block });
    } catch (error) {
      console.warn('Failed to set last sync block:', error);
    }
  }

  /**
   * Helper methods for API calls
   */
  private static async getApiConfig(wallet: Wallet) {
    const settings = await settingsStorage.get();
    const apiUrl = BLOCKFROST_API_URLS[wallet.network];
    const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

    if (!apiUrl || !apiKey) {
      throw new Error(`API configuration missing for ${wallet.network}`);
    }

    return { apiUrl, apiKey };
  }

  private static async getPaymentAddresses(apiUrl: string, apiKey: string, stakeAddress: string): Promise<string[]> {
    const response = await fetch(`${apiUrl}/accounts/${stakeAddress}/addresses`, {
      headers: { project_id: apiKey },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch payment addresses: ${response.statusText}`);
    }

    const data: { address: string }[] = await response.json();
    return data.map(item => item.address);
  }

  private static async getAllTransactionHashes(apiUrl: string, apiKey: string, addresses: string[]): Promise<string[]> {
    const allHashes = new Set<string>();

    for (const address of addresses) {
      const response = await fetch(`${apiUrl}/addresses/${address}/transactions?count=100&order=desc`, {
        headers: { project_id: apiKey },
      });

      if (response.ok) {
        const data: { tx_hash: string }[] = await response.json();
        data.forEach(tx => allHashes.add(tx.tx_hash));
      }
    }

    return Array.from(allHashes);
  }

  private static async getTransactionDetails(
    apiUrl: string,
    apiKey: string,
    txHash: string,
  ): Promise<BlockfrostTransactionDetails> {
    const [txResponse, utxosResponse] = await Promise.all([
      fetch(`${apiUrl}/txs/${txHash}`, { headers: { project_id: apiKey } }),
      fetch(`${apiUrl}/txs/${txHash}/utxos`, { headers: { project_id: apiKey } }),
    ]);

    if (!txResponse.ok || !utxosResponse.ok) {
      throw new Error(`Failed to fetch transaction details for ${txHash}`);
    }

    const [txData, utxoData] = await Promise.all([txResponse.json(), utxosResponse.json()]);

    return {
      ...txData,
      inputs: utxoData.inputs || [],
      outputs: utxoData.outputs || [],
    };
  }

  /**
   * Public API methods
   */
  static async getSyncStatus(walletId: string): Promise<SyncStatus> {
    const status = syncStatuses.get(walletId);
    if (status) {
      return status;
    }

    // Return default status based on cache
    const lastSync = await transactionsStorage.getLastSync(walletId);
    const isStale = Date.now() - lastSync > CACHE_MAX_AGE;

    return {
      isActive: false,
      lastSync,
      isStale,
    };
  }

  static async getCachedData(walletId: string) {
    const [transactions, utxos, lastSync] = await Promise.all([
      transactionsStorage.getWalletTransactions(walletId),
      transactionsStorage.getWalletUTXOs(walletId),
      transactionsStorage.getLastSync(walletId),
    ]);

    const isStale = Date.now() - lastSync > CACHE_MAX_AGE;

    return {
      transactions,
      utxos,
      lastSync,
      isStale,
    };
  }

  /**
   * Private helper methods for progress tracking
   */
  private static updateSyncStatus(walletId: string, status: Partial<SyncStatus>) {
    const currentStatus = syncStatuses.get(walletId) || {
      isActive: false,
      lastSync: 0,
      isStale: true,
    };

    const newStatus = { ...currentStatus, ...status };
    syncStatuses.set(walletId, newStatus);

    // Broadcast to UI components
    chrome.runtime.sendMessage({
      type: 'SYNC_STATUS_UPDATE',
      payload: { walletId, status: newStatus },
    });
  }

  private static updateProgress(walletId: string, message: string, current: number, total: number) {
    const progress: SyncProgress = {
      stage: message,
      current,
      total,
      message,
    };

    this.updateSyncStatus(walletId, { progress });
  }
}
