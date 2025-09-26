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

// Wallet record (without embedded assets)
export interface WalletRecord extends Omit<Wallet, 'assets'> {
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
  // App settings
  theme: 'light' | 'dark';
  mainnetApiKey?: string;
  preprodApiKey?: string;
  onboarded: boolean;
  legalAccepted?: boolean;

  // UI state
  activeWalletId: string | null;
  onboardingStep?: string;
  onboardingFlow?: string | null;
  temporaryFormData?: Record<string, any>;
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

// Extended UI settings with onboarding data
export interface DevxFullUISettings extends DevxUISettings {
  // Onboarding state
  isOnboarding?: boolean;
  onboardingProgress?: number;

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
  // App settings
  theme: 'dark',
  onboarded: false,
  legalAccepted: false,
  mainnetApiKey: '',
  preprodApiKey: '',

  // UI state
  activeWalletId: null,
  onboardingStep: 'welcome',
  onboardingFlow: null,
  temporaryFormData: {},
  sidebarCollapsed: false,
  lastViewedTab: 'assets',
};

export const DEFAULT_DEVX_FULL_UI_SETTINGS: DevxFullUISettings = {
  ...DEFAULT_DEVX_UI_SETTINGS,
  isOnboarding: false,
  onboardingProgress: 0,
  createFormData: {},
  importFormData: {},
  spoofFormData: {},
  apiKeySetupData: {},
  stepHistory: [],
};
