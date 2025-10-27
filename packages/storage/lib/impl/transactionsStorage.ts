import { createIndexedDBStorage } from '../base/indexeddb';
import type { TransactionRecord, UTXORecord, TransactionsStorageData } from '../base/devxTypes';
import type { TransactionInfo, AddressUTXO } from '@extension/shared/lib/types/blockfrost';

// Re-export types
export type { Asset } from '@extension/shared';
export type { TransactionRecord, UTXORecord };

const fallbackData: TransactionsStorageData = {
  transactions: {},
  utxos: {},
  lastFullSync: {},
};

// Create the storage instance
const storage = createIndexedDBStorage('cardano-wallet-dev', 'transactions', fallbackData);

// Helper functions for working with the storage
export const transactionsStorage = {
  ...storage,

  // Get all transactions for a wallet
  async getWalletTransactions(walletId: string): Promise<TransactionRecord[]> {
    const data = await storage.get();
    return Object.values(data.transactions)
      .filter(tx => tx.walletId === walletId)
      .sort((a, b) => b.block_time - a.block_time);
  },

  // Get all UTXOs for a wallet
  async getWalletUTXOs(walletId: string): Promise<UTXORecord[]> {
    const data = await storage.get();
    return Object.values(data.utxos)
      .filter(utxo => utxo.walletId === walletId)
      .sort((a, b) => b.tx_hash.localeCompare(a.tx_hash));
  },

  // Get unspent UTXOs for a wallet
  async getWalletUnspentUTXOs(walletId: string): Promise<UTXORecord[]> {
    const utxos = await this.getWalletUTXOs(walletId);
    return utxos.filter(utxo => !utxo.isSpent);
  },

  // Get spent UTXOs for a wallet
  async getWalletSpentUTXOs(walletId: string): Promise<UTXORecord[]> {
    const utxos = await this.getWalletUTXOs(walletId);
    return utxos.filter(utxo => utxo.isSpent);
  },

  // Get a specific UTXO
  async getUTXO(txHash: string, outputIndex: number): Promise<UTXORecord | null> {
    const data = await storage.get();
    const key = `${txHash}:${outputIndex}`;
    return data.utxos[key] || null;
  },

  // Get a specific transaction
  async getTransaction(txHash: string): Promise<TransactionRecord | null> {
    const data = await storage.get();
    return data.transactions[txHash] || null;
  },

  // Store multiple transactions
  async storeTransactions(walletId: string, transactions: TransactionInfo[]): Promise<void> {
    const now = Date.now();

    await storage.set(data => {
      for (const tx of transactions) {
        data.transactions[tx.hash] = {
          ...tx,
          walletId,
          lastSynced: now,
        };
      }
      return data;
    });
  },

  // Store multiple UTXOs
  async storeUTXOs(walletId: string, utxos: AddressUTXO[]): Promise<void> {
    const now = Date.now();

    await storage.set(data => {
      for (const utxo of utxos) {
        const key = `${utxo.tx_hash}:${utxo.output_index}`;

        data.utxos[key] = {
          ...utxo,
          walletId,
          lastSynced: now,
          isSpent: false,
          spentInTx: null,
        };
      }
      return data;
    });
  },

  // Mark UTXOs as spent
  async markUTXOsAsSpent(utxoKeys: string[], spentInTx: string): Promise<void> {
    await storage.set(data => {
      for (const key of utxoKeys) {
        if (data.utxos[key]) {
          data.utxos[key].isSpent = true;
          data.utxos[key].spentInTx = spentInTx;
        }
      }
      return data;
    });
  },

  // Update last sync timestamp for a wallet
  async updateLastSync(walletId: string): Promise<void> {
    await storage.set(data => {
      data.lastFullSync[walletId] = Date.now();
      return data;
    });
  },

  // Get last sync timestamp for a wallet
  async getLastSync(walletId: string): Promise<number> {
    const data = await storage.get();
    return data.lastFullSync[walletId] || 0;
  },

  // Clear all data for a wallet (e.g., when wallet is deleted)
  async clearWalletData(walletId: string): Promise<void> {
    await storage.set(data => {
      // Remove transactions
      Object.keys(data.transactions).forEach(hash => {
        if (data.transactions[hash].walletId === walletId) {
          delete data.transactions[hash];
        }
      });

      // Remove UTXOs
      Object.keys(data.utxos).forEach(key => {
        if (data.utxos[key].walletId === walletId) {
          delete data.utxos[key];
        }
      });

      // Remove sync timestamp
      delete data.lastFullSync[walletId];

      return data;
    });
  },

  // Get storage statistics
  async getStats(): Promise<{
    totalTransactions: number;
    totalUTXOs: number;
    walletCounts: Record<string, { transactions: number; utxos: number; unspentUTXOs: number }>;
  }> {
    const data = await storage.get();
    const stats = {
      totalTransactions: Object.keys(data.transactions).length,
      totalUTXOs: Object.keys(data.utxos).length,
      walletCounts: {} as Record<string, { transactions: number; utxos: number; unspentUTXOs: number }>,
    };

    // Count by wallet
    const walletStats = stats.walletCounts;

    Object.values(data.transactions).forEach(tx => {
      if (!walletStats[tx.walletId]) {
        walletStats[tx.walletId] = { transactions: 0, utxos: 0, unspentUTXOs: 0 };
      }
      walletStats[tx.walletId].transactions++;
    });

    Object.values(data.utxos).forEach(utxo => {
      if (!walletStats[utxo.walletId]) {
        walletStats[utxo.walletId] = { transactions: 0, utxos: 0, unspentUTXOs: 0 };
      }
      walletStats[utxo.walletId].utxos++;
      if (!utxo.isSpent) {
        walletStats[utxo.walletId].unspentUTXOs++;
      }
    });

    return stats;
  },
};
