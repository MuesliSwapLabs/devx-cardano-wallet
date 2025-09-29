import { createStorage } from '../base/base';
import { StorageEnum } from '../base/enums';
import type { BaseStorage } from '../base/types';
import {
  type DevxFullUISettings,
  type OnboardingFlow,
  type CreateWalletFormData,
  type ImportWalletFormData,
  type SpoofWalletFormData,
  DEFAULT_DEVX_FULL_UI_SETTINGS,
} from '../base/devxTypes';

// Extended storage interface
export interface DevxSettingsStorage extends BaseStorage<DevxFullUISettings> {
  // App settings management
  toggleTheme: () => Promise<void>;
  setMainnetApiKey: (apiKey: string) => Promise<void>;
  setPreprodApiKey: (apiKey: string) => Promise<void>;
  setOnboarded: (onboarded: boolean) => Promise<void>;
  setLegalAccepted: (accepted: boolean) => Promise<void>;
  markOnboarded: () => Promise<void>; // Convenience method
  markLegalAccepted: () => Promise<void>; // Convenience method

  // Active wallet management
  setActiveWalletId: (walletId: string | null) => Promise<void>;
  getActiveWalletId: () => Promise<string | null>;

  // UI state management
  setSidebarCollapsed: (collapsed: boolean) => Promise<void>;
  setLastViewedTab: (tab: string) => Promise<void>;

  // Simplified onboarding management
  resetOnboarding: () => Promise<void>;
  setLastOnboardingUrl: (url: string | null) => Promise<void>;

  // Form data management
  updateCreateFormData: (data: Partial<CreateWalletFormData>) => Promise<void>;
  updateImportFormData: (data: Partial<ImportWalletFormData>) => Promise<void>;
  updateSpoofFormData: (data: Partial<SpoofWalletFormData>) => Promise<void>;
  clearFormData: (flow?: OnboardingFlow) => Promise<void>;
}

// Create the base storage instance using Chrome Storage abstraction
const storage = createStorage<DevxFullUISettings>('devx-settings', DEFAULT_DEVX_FULL_UI_SETTINGS, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true, // Enable reactive updates across all extension contexts
});

// Export the complete settings storage object
export const devxSettings: DevxSettingsStorage = {
  ...storage,

  // ========== App Settings Management ==========

  toggleTheme: async () => {
    await storage.set(settings => ({
      ...settings,
      theme: settings.theme === 'light' ? 'dark' : 'light',
    }));
  },

  setMainnetApiKey: async (apiKey: string) => {
    await storage.set(settings => ({
      ...settings,
      mainnetApiKey: apiKey,
    }));
  },

  setPreprodApiKey: async (apiKey: string) => {
    await storage.set(settings => ({
      ...settings,
      preprodApiKey: apiKey,
    }));
  },

  setOnboarded: async (onboarded: boolean) => {
    await storage.set(settings => ({
      ...settings,
      onboarded,
    }));
  },

  setLegalAccepted: async (accepted: boolean) => {
    await storage.set(settings => ({
      ...settings,
      legalAccepted: accepted,
    }));
  },

  markOnboarded: async () => {
    await storage.set(settings => ({
      ...settings,
      onboarded: true,
    }));
  },

  markLegalAccepted: async () => {
    await storage.set(settings => ({
      ...settings,
      legalAccepted: true,
    }));
  },

  // ========== Active Wallet Management ===========

  setActiveWalletId: async (walletId: string | null) => {
    await storage.set(settings => ({
      ...settings,
      activeWalletId: walletId,
    }));
  },

  getActiveWalletId: async (): Promise<string | null> => {
    const settings = await storage.get();
    return settings.activeWalletId || null;
  },

  // ========== UI State Management ==========

  setSidebarCollapsed: async (collapsed: boolean) => {
    await storage.set(settings => ({
      ...settings,
      sidebarCollapsed: collapsed,
    }));
  },

  setLastViewedTab: async (tab: string) => {
    await storage.set(settings => ({
      ...settings,
      lastViewedTab: tab,
    }));
  },

  // ========== Simplified Onboarding Management ==========

  resetOnboarding: async () => {
    await storage.set(settings => ({
      ...settings,
      lastOnboardingUrl: null,
      createFormData: {},
      importFormData: {},
      spoofFormData: {},
    }));
  },

  setLastOnboardingUrl: async (url: string | null) => {
    await storage.set(settings => ({
      ...settings,
      lastOnboardingUrl: url,
    }));
  },

  // ========== Form Data Management ==========

  updateCreateFormData: async (data: Partial<CreateWalletFormData>) => {
    await storage.set(settings => ({
      ...settings,
      createFormData: { ...(settings.createFormData || {}), ...data },
    }));
  },

  updateImportFormData: async (data: Partial<ImportWalletFormData>) => {
    await storage.set(settings => ({
      ...settings,
      importFormData: { ...(settings.importFormData || {}), ...data },
    }));
  },

  updateSpoofFormData: async (data: Partial<SpoofWalletFormData>) => {
    await storage.set(settings => ({
      ...settings,
      spoofFormData: { ...(settings.spoofFormData || {}), ...data },
    }));
  },

  clearFormData: async (flow?: OnboardingFlow) => {
    await storage.set(settings => {
      if (flow === 'create') {
        return { ...settings, createFormData: {} };
      } else if (flow === 'import') {
        return { ...settings, importFormData: {} };
      } else if (flow === 'spoof') {
        return { ...settings, spoofFormData: {} };
      } else {
        // Clear all form data
        return {
          ...settings,
          createFormData: {},
          importFormData: {},
          spoofFormData: {},
        };
      }
    });
  },
};
