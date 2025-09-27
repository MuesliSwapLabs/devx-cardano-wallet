import type { Wallet, Asset } from '@extension/shared';
import type { TransactionInfo, AddressUTXO, Amount } from '@extension/shared/lib/types/blockfrost';

// Database and store names
export const DEVX_DB = {
  NAME: 'devx-data',
  VERSION: 1,
  STORES: {
    WALLETS: 'wallets',
    TRANSACTIONS: 'transactions',
    UTXOS: 'utxos',
    ASSETS: 'assets',
  },
} as const;

// Wallet record with sync tracking
export interface WalletRecord extends Wallet {
  lastSynced?: number;
}

// Asset record with wallet relationship
export interface AssetRecord extends Asset {
  walletId: string;
  lastSynced: number;
}

// Transaction record with wallet relationship
export interface TransactionRecord extends TransactionInfo {
  walletId: string;
  lastSynced: number;
  isExternal?: boolean;
}

// UTXO record with wallet relationship and spent tracking
export interface UTXORecord extends AddressUTXO {
  walletId: string;
  lastSynced: number;
  isSpent: boolean;
  spentInTx?: string | null;
  isExternal?: boolean;
}

// Onboarding flow types
export type OnboardingFlow = 'create' | 'import' | 'spoof';
export type OnboardingStep =
  | 'welcome'
  | 'legal'
  | 'select-method'
  | 'create-form'
  | 'import-form'
  | 'spoof-form'
  | 'api-key-setup'
  | 'success'
  | 'completed';

// Form data interfaces for each flow
export interface CreateWalletFormData {
  walletName?: string;
  network?: 'Mainnet' | 'Preprod';
  seedPhrase?: string[];
  confirmedSeedPhrase?: string[];
  password?: string;
}

export interface ImportWalletFormData {
  walletName?: string;
  seedPhrase?: string;
  seedWords?: { [key: string]: string };
  wordCount?: number;
  network?: 'Mainnet' | 'Preprod';
  password?: string;
}

export interface SpoofWalletFormData {
  walletName?: string;
  walletAddress?: string;
  network?: 'Mainnet' | 'Preprod';
}

export interface ApiKeySetupData {
  network?: 'Mainnet' | 'Preprod';
  apiKey?: string;
  requiredFor?: OnboardingFlow;
}

// Chrome Storage settings (combines app settings + UI state)
export interface DevxUISettings {
  // App settings (from original settingsStorage)
  theme: 'light' | 'dark';
  mainnetApiKey?: string;
  preprodApiKey?: string;
  onboarded: boolean;
  legalAccepted?: boolean;
  activeWalletId?: string | null;
  lastSyncBlock?: Record<string, number>;

  // UI state
  sidebarCollapsed?: boolean;
  lastViewedTab?: string;
}

// Storage statistics
export interface StorageStats {
  totalWallets: number;
  totalTransactions: number;
  totalUTXOs: number;
  totalAssets: number;
  walletStats: Record<
    string,
    {
      transactions: number;
      utxos: number;
      unspentUTXOs: number;
      assets: number;
    }
  >;
}

// Extended UI settings with onboarding data (using original property names)
export interface DevxFullUISettings extends DevxUISettings {
  // Onboarding state (from original onboardingStorage)
  isActive?: boolean;
  currentFlow?: OnboardingFlow | null;
  currentStep?: OnboardingStep;
  progress?: number;

  // Form data for each flow
  createFormData?: CreateWalletFormData;
  importFormData?: ImportWalletFormData;
  spoofFormData?: SpoofWalletFormData;
  apiKeySetupData?: ApiKeySetupData;

  // Navigation history
  stepHistory?: OnboardingStep[];
}

// Progress mapping for each step
export const STEP_PROGRESS: Record<OnboardingStep, number> = {
  welcome: 0,
  legal: 20,
  'select-method': 40,
  'create-form': 60,
  'import-form': 60,
  'spoof-form': 60,
  'api-key-setup': 80,
  success: 90,
  completed: 100,
};

// Default values
export const DEFAULT_DEVX_UI_SETTINGS: DevxUISettings = {
  // App settings (from original settingsStorage defaults)
  theme: 'dark',
  onboarded: false,
  legalAccepted: false,
  mainnetApiKey: '',
  preprodApiKey: '',
  activeWalletId: null,
  lastSyncBlock: {},

  // UI state
  sidebarCollapsed: false,
  lastViewedTab: 'assets',
};

export const DEFAULT_DEVX_FULL_UI_SETTINGS: DevxFullUISettings = {
  ...DEFAULT_DEVX_UI_SETTINGS,
  // Onboarding state (from original onboardingStorage defaults)
  isActive: false,
  currentFlow: null,
  currentStep: 'welcome',
  progress: 0,
  createFormData: {},
  importFormData: {},
  spoofFormData: {},
  apiKeySetupData: {},
  stepHistory: [],
};
