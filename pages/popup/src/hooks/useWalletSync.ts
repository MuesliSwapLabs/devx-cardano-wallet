import { useState, useEffect, useRef, useCallback } from 'react';
import { devxData } from '@extension/storage';

const SYNC_INTERVAL_MS = 30000; // 30 seconds

/**
 * Centralized wallet sync hook
 * - Syncs on mount if last sync > 30s ago
 * - Auto-syncs every 30 seconds while popup is open
 * - Provides manual trigger for refresh button
 */
export function useWalletSync(walletId: string | undefined) {
  const [isSyncing, setIsSyncing] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const hasSyncedRef = useRef(false);
  const isSyncingRef = useRef(false); // Use ref for guard to avoid dependency issues

  // Trigger syncs: assets + transactions in parallel, then UTXOs after transactions
  const triggerSync = useCallback(async () => {
    if (!walletId || isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      // Assets and transactions can run in parallel
      await Promise.all([
        chrome.runtime.sendMessage({ type: 'SYNC_ASSETS', payload: { walletId } }),
        chrome.runtime.sendMessage({ type: 'SYNC_TRANSACTIONS', payload: { walletId } }),
      ]);

      // UTXOs must run AFTER transactions (it depends on transaction data)
      await chrome.runtime.sendMessage({ type: 'SYNC_UTXOS', payload: { walletId } });

      if (isMountedRef.current) {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      if (isMountedRef.current) {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    }
  }, [walletId]); // No isSyncing dependency - use ref instead

  // Initial sync check and interval setup
  useEffect(() => {
    if (!walletId) return;

    isMountedRef.current = true;
    hasSyncedRef.current = false;

    // Check wallet's lastSynced from IndexedDB
    const checkAndSync = async () => {
      if (hasSyncedRef.current) return;

      try {
        const wallet = await devxData.getWallet(walletId);
        const lastSync = wallet?.lastSynced;

        // Sync if: never synced before OR last sync was > 30s ago
        const needsSync = !lastSync || Date.now() - lastSync > SYNC_INTERVAL_MS;

        if (needsSync && !hasSyncedRef.current) {
          hasSyncedRef.current = true;
          triggerSync();
        }
      } catch (error) {
        console.error('Failed to check wallet sync status:', error);
        // On error, trigger sync anyway to be safe
        if (!hasSyncedRef.current) {
          hasSyncedRef.current = true;
          triggerSync();
        }
      }
    };

    checkAndSync();

    // Set up 30-second interval
    intervalRef.current = setInterval(() => {
      triggerSync();
    }, SYNC_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      isSyncingRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [walletId, triggerSync]);

  // Reset interval when manual sync is triggered
  const manualSync = useCallback(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Trigger sync
    triggerSync();

    // Restart interval
    intervalRef.current = setInterval(() => {
      triggerSync();
    }, SYNC_INTERVAL_MS);
  }, [triggerSync]);

  return {
    isSyncing,
    triggerSync: manualSync,
  };
}
