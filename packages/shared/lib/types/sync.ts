/**
 * Types for sync operations and progress tracking
 */

export type SyncType = 'assets' | 'transactions' | 'utxos';

export type SyncStatus = 'idle' | 'started' | 'progress' | 'completed' | 'error';

export interface SyncProgress {
  status: SyncStatus;
  message?: string;
  current?: number;
  total?: number;
  error?: Error;
}

export interface SyncState {
  status: SyncStatus;
  progress?: {
    current: number;
    total: number;
  };
  message?: string;
  lastUpdated: number;
  error?: string;
}

export interface WalletSyncState {
  assets: SyncState;
  transactions: SyncState;
  utxos: SyncState;
}
