// packages/storage/lib/impl/walletsStorage.ts

import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';
import type { Wallet } from '@extension/shared';

// Define the shape of our custom storage object, including our new methods
type WalletsStorage = BaseStorage<Wallet[]> & {
  addWallet: (newWallet: Wallet) => Promise<void>;
  removeWallet: (walletId: string) => Promise<void>;
  updateWallet: (walletId: string, updatedFields: Partial<Wallet>) => Promise<void>;
};

// Create the base storage instance for an array of wallets (`Wallet[]`)
const storage = createStorage<Wallet[]>(
  'user-wallets', // The key that will be used in chrome.storage
  [], // The default value is an empty array
  { liveUpdate: true },
);

// Export the final object, combining the base storage with our custom methods
export const walletsStorage: WalletsStorage = {
  ...storage,

  /**
   * Adds a new wallet to the list using an immutable update.
   */
  addWallet: async (newWallet: Wallet) => {
    await storage.set(wallets => [...wallets, newWallet]);
  },

  /**
   * Removes a wallet from the list by its unique ID.
   */
  removeWallet: async (walletId: string) => {
    await storage.set(wallets => wallets.filter(w => w.id !== walletId));
  },

  /**
   * Finds a wallet by its ID and updates one or more of its properties.
   */
  updateWallet: async (walletId: string, updatedFields: Partial<Wallet>) => {
    await storage.set(wallets => wallets.map(w => (w.id === walletId ? { ...w, ...updatedFields } : w)));
  },
};
