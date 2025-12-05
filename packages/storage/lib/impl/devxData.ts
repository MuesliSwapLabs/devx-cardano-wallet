import type { Wallet, Asset } from '@extension/shared';
import type { TransactionInfo, AddressUTXO } from '@extension/shared/lib/types/blockfrost';
import {
  DEVX_DB,
  type WalletRecord,
  type AssetRecord,
  type TransactionRecord,
  type UTXORecord,
  type StorageStats,
} from '../base/devxTypes';

/**
 * Direct IndexedDB storage service for DevX wallet data
 * No abstraction layer - direct IndexedDB API usage for better performance
 */
class DevxDataStorage {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Get or create database connection
   */
  private async getDatabase(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DEVX_DB.NAME, DEVX_DB.VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;

        // Handle unexpected closes
        this.db.onclose = () => {
          console.warn('DevX IndexedDB connection closed unexpectedly');
          this.db = null;
          this.dbPromise = null;
        };

        resolve(this.db);
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create wallets store
        if (!db.objectStoreNames.contains(DEVX_DB.STORES.WALLETS)) {
          const walletsStore = db.createObjectStore(DEVX_DB.STORES.WALLETS, { keyPath: 'id' });
          walletsStore.createIndex('network', 'network', { unique: false });
          walletsStore.createIndex('type', 'type', { unique: false });
          walletsStore.createIndex('stakeAddress', 'stakeAddress', { unique: false });
        }

        // Create transactions store with composite key (walletId + hash)
        if (!db.objectStoreNames.contains(DEVX_DB.STORES.TRANSACTIONS)) {
          const txStore = db.createObjectStore(DEVX_DB.STORES.TRANSACTIONS, {
            keyPath: ['walletId', 'hash'],
          });
          txStore.createIndex('walletId', 'walletId', { unique: false });
          txStore.createIndex('block_time', 'block_time', { unique: false });
          txStore.createIndex('walletId_block_time', ['walletId', 'block_time'], { unique: false });
        }

        // Create UTXOs store with composite key
        if (!db.objectStoreNames.contains(DEVX_DB.STORES.UTXOS)) {
          const utxoStore = db.createObjectStore(DEVX_DB.STORES.UTXOS, {
            keyPath: ['tx_hash', 'output_index'],
          });
          utxoStore.createIndex('walletId', 'walletId', { unique: false });
          utxoStore.createIndex('address', 'address', { unique: false });
          utxoStore.createIndex('tx_hash', 'tx_hash', { unique: false });
          utxoStore.createIndex('isSpent', 'isSpent', { unique: false });
        }

        // Create assets store
        if (!db.objectStoreNames.contains(DEVX_DB.STORES.ASSETS)) {
          const assetsStore = db.createObjectStore(DEVX_DB.STORES.ASSETS, {
            keyPath: ['walletId', 'unit'],
          });
          assetsStore.createIndex('walletId', 'walletId', { unique: false });
          assetsStore.createIndex('unit', 'unit', { unique: false });
          assetsStore.createIndex('policyId', 'policyId', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  // ========== Wallet Methods ==========

  async getWallets(): Promise<WalletRecord[]> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.WALLETS], 'readonly');
      const store = transaction.objectStore(DEVX_DB.STORES.WALLETS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getWallet(walletId: string): Promise<WalletRecord | null> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.WALLETS], 'readonly');
      const store = transaction.objectStore(DEVX_DB.STORES.WALLETS);
      const request = store.get(walletId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async hasWallets(): Promise<boolean> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.WALLETS], 'readonly');
      const store = transaction.objectStore(DEVX_DB.STORES.WALLETS);
      const request = store.count();

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => reject(request.error);
    });
  }

  async addWallet(wallet: WalletRecord): Promise<void> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.WALLETS], 'readwrite');
      const store = transaction.objectStore(DEVX_DB.STORES.WALLETS);
      // Don't set lastSynced - leave it undefined so sync triggers on first open
      const request = store.add(wallet);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateWallet(walletId: string, updates: Partial<WalletRecord>): Promise<void> {
    const db = await this.getDatabase();
    const wallet = await this.getWallet(walletId);
    if (!wallet) throw new Error(`Wallet not found: ${walletId}`);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.WALLETS], 'readwrite');
      const store = transaction.objectStore(DEVX_DB.STORES.WALLETS);
      const updatedWallet = { ...wallet, ...updates, lastSynced: Date.now() };
      const request = store.put(updatedWallet);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeWallet(walletId: string): Promise<void> {
    const db = await this.getDatabase();

    // Delete wallet record
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.WALLETS], 'readwrite');
      transaction.objectStore(DEVX_DB.STORES.WALLETS).delete(walletId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // Delete all transactions for this wallet
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.TRANSACTIONS], 'readwrite');
      const store = transaction.objectStore(DEVX_DB.STORES.TRANSACTIONS);
      const index = store.index('walletId');
      const request = index.openCursor(IDBKeyRange.only(walletId));

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // Delete all UTXOs for this wallet
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.UTXOS], 'readwrite');
      const store = transaction.objectStore(DEVX_DB.STORES.UTXOS);
      const index = store.index('walletId');
      const request = index.openCursor(IDBKeyRange.only(walletId));

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // Delete all assets for this wallet
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.ASSETS], 'readwrite');
      const store = transaction.objectStore(DEVX_DB.STORES.ASSETS);
      const index = store.index('walletId');
      const request = index.openCursor(IDBKeyRange.only(walletId));

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ========== Transaction Methods ==========

  async getWalletTransactions(walletId: string): Promise<TransactionRecord[]> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.TRANSACTIONS], 'readonly');
      const store = transaction.objectStore(DEVX_DB.STORES.TRANSACTIONS);
      const index = store.index('walletId');
      const request = index.getAll(walletId);

      request.onsuccess = () => {
        const transactions = request.result || [];
        transactions.sort((a, b) => b.block_time - a.block_time);
        resolve(transactions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getTransaction(walletId: string, txHash: string): Promise<TransactionRecord | null> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.TRANSACTIONS], 'readonly');
      const store = transaction.objectStore(DEVX_DB.STORES.TRANSACTIONS);
      const request = store.get([walletId, txHash]);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async storeTransactions(walletId: string, transactions: TransactionInfo[]): Promise<void> {
    const db = await this.getDatabase();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.TRANSACTIONS], 'readwrite');
      const store = transaction.objectStore(DEVX_DB.STORES.TRANSACTIONS);

      transactions.forEach(tx => {
        const record: TransactionRecord = {
          ...tx,
          walletId,
          lastSynced: now,
        };
        store.put(record);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ========== UTXO Methods ==========

  async getWalletUTXOs(walletId: string): Promise<UTXORecord[]> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.UTXOS], 'readonly');
      const store = transaction.objectStore(DEVX_DB.STORES.UTXOS);
      const index = store.index('walletId');
      const request = index.getAll(walletId);

      request.onsuccess = () => {
        const utxos = request.result || [];
        utxos.sort((a, b) => b.tx_hash.localeCompare(a.tx_hash));
        resolve(utxos);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getWalletUnspentUTXOs(walletId: string): Promise<UTXORecord[]> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.UTXOS], 'readonly');
      const store = transaction.objectStore(DEVX_DB.STORES.UTXOS);
      const index = store.index('walletId');
      const request = index.getAll(walletId);

      request.onsuccess = () => {
        const allUtxos = request.result || [];
        const utxos = allUtxos.filter(utxo => !utxo.isSpent);
        utxos.sort((a, b) => b.tx_hash.localeCompare(a.tx_hash));
        resolve(utxos);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUTXO(txHash: string, outputIndex: number): Promise<UTXORecord | null> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.UTXOS], 'readonly');
      const store = transaction.objectStore(DEVX_DB.STORES.UTXOS);
      const request = store.get([txHash, outputIndex]);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async storeUTXOs(walletId: string, utxos: UTXORecord[]): Promise<void> {
    const db = await this.getDatabase();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.UTXOS], 'readwrite');
      const store = transaction.objectStore(DEVX_DB.STORES.UTXOS);

      utxos.forEach(utxo => {
        const record: UTXORecord = {
          ...utxo,
          lastSynced: now,
        };
        store.put(record);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async markUTXOsAsSpent(utxoRefs: Array<{ tx_hash: string; output_index: number }>, spentInTx: string): Promise<void> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.UTXOS], 'readwrite');
      const store = transaction.objectStore(DEVX_DB.STORES.UTXOS);

      utxoRefs.forEach(ref => {
        const request = store.get([ref.tx_hash, ref.output_index]);
        request.onsuccess = () => {
          const utxo = request.result;
          if (utxo) {
            utxo.isSpent = true;
            utxo.spentInTx = spentInTx;
            store.put(utxo);
          }
        };
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ========== Asset Methods ==========

  async getWalletAssets(walletId: string): Promise<AssetRecord[]> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.ASSETS], 'readonly');
      const store = transaction.objectStore(DEVX_DB.STORES.ASSETS);
      const index = store.index('walletId');
      const request = index.getAll(walletId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async storeAssets(walletId: string, assets: Asset[]): Promise<void> {
    const db = await this.getDatabase();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.ASSETS], 'readwrite');
      const store = transaction.objectStore(DEVX_DB.STORES.ASSETS);

      // Clear existing assets for this wallet first
      const index = store.index('walletId');
      index.openCursor(IDBKeyRange.only(walletId)).onsuccess = event => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          // After clearing, add new assets
          assets.forEach(asset => {
            const record: AssetRecord = {
              ...asset,
              walletId,
              lastSynced: now,
            };
            store.put(record);
          });
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async updateAsset(walletId: string, unit: string, updates: Partial<Asset>): Promise<void> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEVX_DB.STORES.ASSETS], 'readwrite');
      const store = transaction.objectStore(DEVX_DB.STORES.ASSETS);
      const request = store.get([walletId, unit]);

      request.onsuccess = () => {
        const asset = request.result;
        if (asset) {
          const updatedAsset = { ...asset, ...updates, lastSynced: Date.now() };
          store.put(updatedAsset);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ========== Utility Methods ==========

  async getFullWallet(walletId: string): Promise<Wallet | null> {
    const walletRecord = await this.getWallet(walletId);
    if (!walletRecord) return null;

    // Return wallet record as Wallet (no assets property anymore)
    return walletRecord;
  }

  async getStats(): Promise<StorageStats> {
    const wallets = await this.getWallets();

    const stats: StorageStats = {
      totalWallets: wallets.length,
      totalTransactions: 0,
      totalUTXOs: 0,
      totalAssets: 0,
      walletStats: {},
    };

    // Get counts for each wallet
    for (const wallet of wallets) {
      const transactions = await this.getWalletTransactions(wallet.id);
      const utxos = await this.getWalletUTXOs(wallet.id);
      const unspentUTXOs = utxos.filter(u => !u.isSpent);
      const assets = await this.getWalletAssets(wallet.id);

      stats.totalTransactions += transactions.length;
      stats.totalUTXOs += utxos.length;
      stats.totalAssets += assets.length;

      stats.walletStats[wallet.id] = {
        transactions: transactions.length,
        utxos: utxos.length,
        unspentUTXOs: unspentUTXOs.length,
        assets: assets.length,
      };
    }

    return stats;
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [DEVX_DB.STORES.WALLETS, DEVX_DB.STORES.TRANSACTIONS, DEVX_DB.STORES.UTXOS, DEVX_DB.STORES.ASSETS],
        'readwrite',
      );

      transaction.objectStore(DEVX_DB.STORES.WALLETS).clear();
      transaction.objectStore(DEVX_DB.STORES.TRANSACTIONS).clear();
      transaction.objectStore(DEVX_DB.STORES.UTXOS).clear();
      transaction.objectStore(DEVX_DB.STORES.ASSETS).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Export singleton instance
export const devxData = new DevxDataStorage();
