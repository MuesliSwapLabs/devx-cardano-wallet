import { v4 as uuidv4 } from 'uuid';
import { Wallet, encrypt } from '@extension/shared';
import { getWalletState } from '@extension/blockchain-provider';

export async function createNewWallet(
  name: string,
  network: 'Mainnet' | 'Preprod',
  password?: string,
  seedPhrase?: string,
  address?: string,
): Promise<Wallet> {
  // Seed phrase and address should be provided by the background script
  if (!seedPhrase || !address) {
    throw new Error('Seed phrase and address must be provided by crypto operations');
  }

  const wallet: Wallet = {
    id: uuidv4(),
    name,
    address,
    network,
    balance: '0',
    assets: [],
    type: 'HD',
    hasPassword: !!password,
    secret: password ? await encrypt(seedPhrase, password) : seedPhrase,
  };
  return wallet;
}

export async function importWallet(
  name: string,
  network: 'Mainnet' | 'Preprod',
  seedPhrase: string,
  password?: string,
  derivedAddress?: string,
): Promise<Wallet> {
  // Address should be provided by the background script after validation
  if (!derivedAddress) {
    throw new Error('Derived address must be provided by crypto operations');
  }

  const wallet: Wallet = {
    id: uuidv4(),
    name,
    address: derivedAddress,
    network,
    balance: '0',
    assets: [],
    type: 'HD',
    hasPassword: !!password,
    secret: password ? await encrypt(seedPhrase, password) : seedPhrase,
  };
  return wallet;
}

export async function spoofWallet(name: string, address: string, network: 'Mainnet' | 'Preprod'): Promise<Wallet> {
  // Create a temporary wallet object to get the network state
  const tempWallet: Wallet = {
    id: 'temp',
    name: 'temp',
    address,
    network,
    balance: '0',
    assets: [],
    type: 'SPOOFED',
    hasPassword: false,
    secret: null,
  };

  // First, we get the full state from the provider.
  const state = await getWalletState(tempWallet);

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
    network,
    balance: state.balance,
    assets: state.assets,
    type: 'SPOOFED',
    hasPassword: false,
    secret: null,
  };

  return wallet;
}
