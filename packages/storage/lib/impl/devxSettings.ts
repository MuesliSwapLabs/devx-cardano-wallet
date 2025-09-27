import { createStorage } from '../base/base';
import { StorageEnum } from '../base/enums';
import type { BaseStorage } from '../base/types';
import {
  type DevxFullUISettings,
  type OnboardingFlow,
  type OnboardingStep,
  type CreateWalletFormData,
  type ImportWalletFormData,
  type SpoofWalletFormData,
  type ApiKeySetupData,
  STEP_PROGRESS,
  DEFAULT_DEVX_FULL_UI_SETTINGS,
} from '../base/devxTypes';

// Extended storage interface
export interface DevxSettingsStorage extends BaseStorage<DevxFullUISettings> {
  // App settings management
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
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

  // Onboarding management
  startOnboarding: (flow?: OnboardingFlow) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  setOnboardingStep: (step: OnboardingStep) => Promise<void>;
  setOnboardingFlow: (flow: OnboardingFlow | null) => Promise<void>;
  updateOnboardingProgress: (progress: number) => Promise<void>;
  updateProgress: (progress: number) => Promise<void>; // Alias for updateOnboardingProgress
  goToStep: (step: OnboardingStep, updateProgress?: boolean) => Promise<void>;
  setCurrentFlow: (flow: OnboardingFlow) => Promise<void>; // Alias for setOnboardingFlow

  // Form data management
  updateCreateFormData: (data: Partial<CreateWalletFormData>) => Promise<void>;
  updateImportFormData: (data: Partial<ImportWalletFormData>) => Promise<void>;
  updateSpoofFormData: (data: Partial<SpoofWalletFormData>) => Promise<void>;
  updateApiKeySetupData: (data: Partial<ApiKeySetupData>) => Promise<void>;
  clearFormData: (flow?: OnboardingFlow) => Promise<void>;

  // Utility methods
  clearTemporaryData: () => Promise<void>;
  getOnboardingState: () => Promise<{
    isActive: boolean;
    currentFlow: OnboardingFlow | null;
    currentStep: OnboardingStep;
    progress: number;
  }>;
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

  setTheme: async (theme: 'light' | 'dark') => {
    await storage.set(settings => ({
      ...settings,
      theme,
    }));
  },

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

  // ========== Onboarding Management ==========

  startOnboarding: async (flow?: OnboardingFlow) => {
    await storage.set(settings => ({
      ...settings,
      isActive: true,
      currentFlow: flow || null,
      currentStep: flow ? 'select-method' : 'welcome',
      progress: flow ? STEP_PROGRESS['select-method'] : STEP_PROGRESS['welcome'],
      stepHistory: [],
    }));
  },

  completeOnboarding: async () => {
    await storage.set(settings => ({
      ...settings,
      isActive: false,
      currentStep: 'completed',
      progress: 100,
      // Clear form data on completion
      createFormData: {},
      importFormData: {},
      spoofFormData: {},
      apiKeySetupData: {},
    }));
  },

  resetOnboarding: async () => {
    await storage.set(settings => ({
      ...settings,
      isActive: false,
      currentFlow: null,
      currentStep: 'welcome',
      progress: 0,
      createFormData: {},
      importFormData: {},
      spoofFormData: {},
      apiKeySetupData: {},
      stepHistory: [],
    }));
  },

  setOnboardingStep: async (step: OnboardingStep) => {
    await storage.set(settings => ({
      ...settings,
      currentStep: step,
      progress: STEP_PROGRESS[step],
      stepHistory: [...(settings.stepHistory || []), step],
    }));
  },

  setOnboardingFlow: async (flow: OnboardingFlow | null) => {
    await storage.set(settings => ({
      ...settings,
      currentFlow: flow,
    }));
  },

  updateOnboardingProgress: async (progress: number) => {
    await storage.set(settings => ({
      ...settings,
      progress: Math.min(100, Math.max(0, progress)),
    }));
  },

  updateProgress: async (progress: number) => {
    // Alias for updateOnboardingProgress
    await storage.set(settings => ({
      ...settings,
      progress: Math.min(100, Math.max(0, progress)),
    }));
  },

  goToStep: async (step: OnboardingStep, updateProgress = true) => {
    await storage.set(settings => ({
      ...settings,
      currentStep: step,
      progress: updateProgress ? STEP_PROGRESS[step] : settings.progress,
      stepHistory: [...(settings.stepHistory || []), step],
    }));
  },

  setCurrentFlow: async (flow: OnboardingFlow) => {
    // Alias for setOnboardingFlow
    await storage.set(settings => ({
      ...settings,
      currentFlow: flow,
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

  updateApiKeySetupData: async (data: Partial<ApiKeySetupData>) => {
    await storage.set(settings => ({
      ...settings,
      apiKeySetupData: { ...(settings.apiKeySetupData || {}), ...data },
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
          apiKeySetupData: {},
        };
      }
    });
  },

  // ========== Utility Methods ==========

  clearTemporaryData: async () => {
    await storage.set(settings => ({
      ...settings,
      temporaryFormData: {},
      createFormData: {},
      importFormData: {},
      spoofFormData: {},
      apiKeySetupData: {},
    }));
  },

  getOnboardingState: async () => {
    const settings = await storage.get();
    return {
      isActive: settings.isActive || false,
      currentFlow: (settings.currentFlow as OnboardingFlow) || null,
      currentStep: (settings.currentStep as OnboardingStep) || 'welcome',
      progress: settings.progress || 0,
    };
  },
};
