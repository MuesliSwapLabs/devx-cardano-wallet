import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

// --- Define the types for our settings ---
export type Theme = 'light' | 'dark';
export type Network = 'Mainnet' | 'Preprod';

// This is the new, unified shape for all app settings.
export interface AppSettings {
  theme: Theme;
  network: Network;
  onboarded: boolean;
  legalAccepted?: boolean;
}

// Define the default state for a first-time user.
// ADAPTATION: Default network is now 'Preprod' as requested.
const defaultSettings: AppSettings = {
  theme: 'dark',
  network: 'Preprod',
  onboarded: false,
  legalAccepted: false,
};

// --- Define the custom methods for our new storage object ---
export interface SettingsStorage extends BaseStorage<AppSettings> {
  toggleTheme: () => Promise<void>;
  toggleNetwork: () => Promise<void>;
  markOnboarded: () => Promise<void>;
  unmarkOnboarded: () => Promise<void>;
  markLegalAccepted: () => Promise<void>;
}

// Create the base storage instance using the factory from base.ts.
const storage = createStorage<AppSettings>('app-settings-key', defaultSettings, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// --- Export the final, complete storage object ---
export const settingsStorage: SettingsStorage = {
  // Include all the base methods (get, set, subscribe, getSnapshot)
  ...storage,

  toggleTheme: async () => {
    await storage.set(settings => ({
      ...settings,
      theme: settings.theme === 'light' ? 'dark' : 'light',
    }));
  },

  toggleNetwork: async () => {
    await storage.set(settings => ({
      ...settings,
      network: settings.network === 'Mainnet' ? 'Preprod' : 'Mainnet',
    }));
  },

  markOnboarded: async () => {
    await storage.set(settings => ({
      ...settings,
      onboarded: true,
    }));
  },

  unmarkOnboarded: async () => {
    await storage.set(settings => ({
      ...settings,
      onboarded: false,
    }));
  },

  /** Marks that the user has accepted the legal terms. */
  markLegalAccepted: async () => {
    // <-- NEW METHOD IMPLEMENTATION
    await storage.set(settings => ({
      ...settings,
      legalAccepted: true,
    }));
  },
};
