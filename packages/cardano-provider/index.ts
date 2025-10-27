// Wallet operations
export { createNewWallet } from './lib/wallet/create';
export { spoofWallet } from './lib/wallet/spoof';

// Sync operations
export { syncWalletAssets } from './lib/sync/assets';
export { syncWalletTransactions } from './lib/sync/transactions';
export { syncWalletUtxos } from './lib/sync/utxos';
export { syncWalletPaymentAddresses } from './lib/sync/paymentAddresses';

// Blockfrost client
export { BlockfrostClient } from './lib/client/blockfrost';
export type { BlockfrostClientConfig } from './lib/client/blockfrost';
