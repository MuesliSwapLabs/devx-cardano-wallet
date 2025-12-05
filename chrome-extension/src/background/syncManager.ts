/**
 * Centralized sync manager for background service worker
 * Handles deduplication and progress broadcasting for wallet sync operations
 */

import type { SyncProgress, SyncType } from '@extension/shared/lib/types/sync';

interface ActiveSync {
  promise: Promise<void>;
  abortController: AbortController;
}

interface WalletSyncs {
  assets?: ActiveSync;
  transactions?: ActiveSync;
  utxos?: ActiveSync;
}

class SyncManager {
  private activeSyncs = new Map<string, WalletSyncs>();

  /**
   * Start or join an assets sync for a wallet
   * If sync is already running, returns the existing promise (deduplication)
   */
  async startAssetsSync(
    walletId: string,
    syncFn: (abortSignal: AbortSignal, onProgress: (progress: SyncProgress) => void) => Promise<void>,
  ): Promise<void> {
    const existing = this.activeSyncs.get(walletId)?.assets;
    if (existing) {
      console.log(`[SyncManager] Assets sync already running for wallet ${walletId}, joining existing sync`);
      return existing.promise;
    }

    console.log(`[SyncManager] Starting new assets sync for wallet ${walletId}`);

    const abortController = new AbortController();
    const syncPromise = this.executeSync('assets', walletId, syncFn, abortController);

    // Store the active sync
    const walletSyncs = this.activeSyncs.get(walletId) || {};
    walletSyncs.assets = { promise: syncPromise, abortController };
    this.activeSyncs.set(walletId, walletSyncs);

    // Clean up after completion
    syncPromise.finally(() => {
      const syncs = this.activeSyncs.get(walletId);
      if (syncs) {
        delete syncs.assets;
        if (Object.keys(syncs).length === 0) {
          this.activeSyncs.delete(walletId);
        }
      }
    });

    return syncPromise;
  }

  /**
   * Start or join a transactions sync for a wallet
   */
  async startTransactionsSync(
    walletId: string,
    syncFn: (abortSignal: AbortSignal, onProgress: (progress: SyncProgress) => void) => Promise<void>,
  ): Promise<void> {
    const existing = this.activeSyncs.get(walletId)?.transactions;
    if (existing) {
      console.log(`[SyncManager] Transactions sync already running for wallet ${walletId}, joining existing sync`);
      return existing.promise;
    }

    console.log(`[SyncManager] Starting new transactions sync for wallet ${walletId}`);

    const abortController = new AbortController();
    const syncPromise = this.executeSync('transactions', walletId, syncFn, abortController);

    const walletSyncs = this.activeSyncs.get(walletId) || {};
    walletSyncs.transactions = { promise: syncPromise, abortController };
    this.activeSyncs.set(walletId, walletSyncs);

    syncPromise.finally(() => {
      const syncs = this.activeSyncs.get(walletId);
      if (syncs) {
        delete syncs.transactions;
        if (Object.keys(syncs).length === 0) {
          this.activeSyncs.delete(walletId);
        }
      }
    });

    return syncPromise;
  }

  /**
   * Start or join a UTXOs sync for a wallet
   */
  async startUtxosSync(
    walletId: string,
    syncFn: (abortSignal: AbortSignal, onProgress: (progress: SyncProgress) => void) => Promise<void>,
  ): Promise<void> {
    const existing = this.activeSyncs.get(walletId)?.utxos;
    if (existing) {
      console.log(`[SyncManager] UTXOs sync already running for wallet ${walletId}, joining existing sync`);
      return existing.promise;
    }

    console.log(`[SyncManager] Starting new UTXOs sync for wallet ${walletId}`);

    const abortController = new AbortController();
    const syncPromise = this.executeSync('utxos', walletId, syncFn, abortController);

    const walletSyncs = this.activeSyncs.get(walletId) || {};
    walletSyncs.utxos = { promise: syncPromise, abortController };
    this.activeSyncs.set(walletId, walletSyncs);

    syncPromise.finally(() => {
      const syncs = this.activeSyncs.get(walletId);
      if (syncs) {
        delete syncs.utxos;
        if (Object.keys(syncs).length === 0) {
          this.activeSyncs.delete(walletId);
        }
      }
    });

    return syncPromise;
  }

  /**
   * Execute a sync operation with progress broadcasting
   */
  private async executeSync(
    type: SyncType,
    walletId: string,
    syncFn: (abortSignal: AbortSignal, onProgress: (progress: SyncProgress) => void) => Promise<void>,
    abortController: AbortController,
  ): Promise<void> {
    // Broadcast started status
    this.broadcastProgress(type, walletId, {
      status: 'started',
      message: `Starting ${type} sync`,
    });

    try {
      await syncFn(abortController.signal, progress => {
        this.broadcastProgress(type, walletId, progress);
      });

      // Broadcast completion
      this.broadcastProgress(type, walletId, {
        status: 'completed',
        message: `${type} sync completed`,
      });
    } catch (error) {
      // Broadcast error
      this.broadcastProgress(type, walletId, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw error;
    }
  }

  /**
   * Broadcast progress update to all connected popup instances
   */
  private broadcastProgress(type: SyncType, walletId: string, progress: SyncProgress): void {
    // Send message to all extension contexts (popup, devtools, etc.)
    chrome.runtime
      .sendMessage({
        type: 'SYNC_PROGRESS',
        payload: {
          syncType: type,
          walletId,
          progress,
          timestamp: Date.now(),
        },
      })
      .catch(err => {
        // It's OK if no receivers are listening
        if (!err.message?.includes('Could not establish connection')) {
          console.error('[SyncManager] Error broadcasting progress:', err);
        }
      });
  }

  /**
   * Get current sync status for a wallet
   */
  getSyncStatus(walletId: string): {
    assets: boolean;
    transactions: boolean;
    utxos: boolean;
  } {
    const syncs = this.activeSyncs.get(walletId);
    return {
      assets: !!syncs?.assets,
      transactions: !!syncs?.transactions,
      utxos: !!syncs?.utxos,
    };
  }

  /**
   * Abort a specific sync operation
   */
  abortSync(walletId: string, type: SyncType): void {
    const syncs = this.activeSyncs.get(walletId);
    if (!syncs) return;

    const sync = syncs[type];
    if (sync) {
      console.log(`[SyncManager] Aborting ${type} sync for wallet ${walletId}`);
      sync.abortController.abort();
    }
  }

  /**
   * Abort all syncs for a wallet
   */
  abortAllSyncs(walletId: string): void {
    const syncs = this.activeSyncs.get(walletId);
    if (!syncs) return;

    console.log(`[SyncManager] Aborting all syncs for wallet ${walletId}`);

    if (syncs.assets) syncs.assets.abortController.abort();
    if (syncs.transactions) syncs.transactions.abortController.abort();
    if (syncs.utxos) syncs.utxos.abortController.abort();

    this.activeSyncs.delete(walletId);
  }
}

// Singleton instance
export const syncManager = new SyncManager();
