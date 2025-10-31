// Wallet operations
export { createNewWallet } from './lib/wallet/create';
export { importWallet } from './lib/wallet/import';
export { spoofWallet } from './lib/wallet/spoof';
export { getWalletState } from './lib/wallet/state';

// Sync operations
export { syncWalletAssets } from './lib/sync/assets';
export { syncWalletTransactions } from './lib/sync/transactions';
export { syncWalletUtxos } from './lib/sync/utxos';
export { syncWalletPaymentAddresses } from './lib/sync/paymentAddresses';

// Blockfrost client
export { BlockfrostClient } from './lib/client/blockfrost';
export type { BlockfrostClientConfig } from './lib/client/blockfrost';

// Re-export WalletState type
export type { WalletState } from '@extension/shared';
