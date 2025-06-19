import { v4 as uuidv4 } from 'uuid';
import { Wallet, encrypt } from '@extension/shared';
import { getWalletState } from '@extension/blockchain-provider';
import { settingsStorage } from '@extension/storage';

export async function createNewWallet(name: string, password?: string): Promise<Wallet> {
  // TODO: Replace with real seed phrase generation
  const seedPhrase = 'example super secret seed phrase for a new wallet';
  const newAddress = `addr_test_new_${Date.now()}`;

  const wallet: Wallet = {
    id: uuidv4(),
    name,
    address: newAddress,
    network: 'Preprod', // Default network
    balance: '0',
    assets: [],
    type: 'HD',
    hasPassword: !!password,
    secret: password ? await encrypt(seedPhrase, password) : seedPhrase,
  };
  return wallet;
}

export async function importWallet(name: string, seedPhrase: string, password?: string): Promise<Wallet> {
  // TODO: Validate seed phrase and derive address
  const derivedAddress = `addr_test_imported_${Date.now()}`;

  const wallet: Wallet = {
    id: uuidv4(),
    name,
    address: derivedAddress,
    network: 'Preprod', // Default network
    balance: '0',
    assets: [],
    type: 'HD',
    hasPassword: !!password,
    secret: password ? await encrypt(seedPhrase, password) : seedPhrase,
  };
  return wallet;
}

export async function spoofWallet(name: string, address: string): Promise<Wallet> {
  // First, we get the full state from the provider.
  const state = await getWalletState(address);

  // Handle cases where the address is not valid or not found.
  if (state.status === 'invalid_address') {
    throw new Error('The provided address format is invalid.');
  }
  if (state.status === 'not_found') {
    throw new Error('This address is valid but has no on-chain history.');
  }

  // If the address is found, we use the real on-chain data to build the wallet.
  const wallet: Wallet = {
    id: uuidv4(),
    name,
    // We use the stake address as the primary identifier for the spoofed wallet.
    address: state.stakeAddress || state.address,
    network: (await settingsStorage.get()).network, // Get current network for consistency
    balance: state.balance,
    assets: state.assets,
    type: 'SPOOFED',
    hasPassword: false,
    secret: null,
  };

  return wallet;
}
