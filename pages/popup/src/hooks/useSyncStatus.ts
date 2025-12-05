import { useState, useEffect } from 'react';
import type { SyncType, WalletSyncState, SyncProgress } from '@extension/shared/lib/types/sync';

const DEFAULT_SYNC_STATE = {
  status: 'idle' as const,
  lastUpdated: Date.now(),
};

const DEFAULT_WALLET_SYNC_STATE: WalletSyncState = {
  assets: DEFAULT_SYNC_STATE,
  transactions: DEFAULT_SYNC_STATE,
  utxos: DEFAULT_SYNC_STATE,
};

/**
 * Hook to listen for sync progress updates from background
 * Only shows status while sync is actively running
 */
export function useSyncStatus(walletId: string | undefined) {
  const [syncState, setSyncState] = useState<WalletSyncState>(DEFAULT_WALLET_SYNC_STATE);

  // Listen for sync progress messages from background
  useEffect(() => {
    if (!walletId) return;

    const handleMessage = (message: any) => {
      if (message.type === 'SYNC_PROGRESS' && message.payload?.walletId === walletId) {
        const { syncType, progress } = message.payload as {
          syncType: SyncType;
          progress: SyncProgress;
        };

        setSyncState(prev => ({
          ...prev,
          [syncType]: {
            status: progress.status,
            progress:
              progress.current && progress.total ? { current: progress.current, total: progress.total } : undefined,
            message: progress.message,
            lastUpdated: Date.now(),
            error: progress.error?.message,
          },
        }));
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [walletId]);

  return {
    syncState,
    isSyncing:
      syncState.assets.status === 'progress' ||
      syncState.assets.status === 'started' ||
      syncState.transactions.status === 'progress' ||
      syncState.transactions.status === 'started' ||
      syncState.utxos.status === 'progress' ||
      syncState.utxos.status === 'started',
  };
}
