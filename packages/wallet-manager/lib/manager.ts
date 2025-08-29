import { v4 as uuidv4 } from 'uuid';
import type { Wallet } from '@extension/shared';
import { encrypt } from '@extension/shared';
import { getWalletState } from '@extension/blockchain-provider';

export async function createNewWallet(
  name: string,
  network: 'Mainnet' | 'Preprod',
  password?: string,
  seedPhrase?: string,
  address?: string,
  stakeAddress?: string,
  rootKey?: string,
): Promise<Wallet> {
  // Seed phrase, address and stakeAddress should be provided by the background script
  if (!seedPhrase || !address || !stakeAddress) {
    throw new Error('Seed phrase, address, and stake address must be provided by crypto operations');
  }

  const wallet: Wallet = {
    id: uuidv4(),
    name,
    address,
    stakeAddress,
    network,
    balance: '0',
    assets: [],
    type: 'HD',
    hasPassword: !!password,
    seedPhrase: password ? await encrypt(seedPhrase, password) : seedPhrase,
    rootKey: rootKey ? (password ? await encrypt(rootKey, password) : rootKey) : null,
  };
  return wallet;
}

export async function importWallet(
  name: string,
  network: 'Mainnet' | 'Preprod',
  seedPhrase: string,
  password?: string,
  derivedAddress?: string,
  stakeAddress?: string,
  rootKey?: string,
): Promise<Wallet> {
  // Address and stake address should be provided by the background script after validation
  if (!derivedAddress || !stakeAddress) {
    throw new Error('Derived address and stake address must be provided by crypto operations');
  }

  const wallet: Wallet = {
    id: uuidv4(),
    name,
    address: derivedAddress,
    stakeAddress,
    network,
    balance: '0',
    assets: [],
    type: 'HD',
    hasPassword: !!password,
    seedPhrase: password ? await encrypt(seedPhrase, password) : seedPhrase,
    rootKey: rootKey ? (password ? await encrypt(rootKey, password) : rootKey) : null,
  };
  return wallet;
}

export async function spoofWallet(name: string, inputAddress: string, network: 'Mainnet' | 'Preprod'): Promise<Wallet> {
  // Determine if input is stake address or payment address
  const isStakeAddress = inputAddress.startsWith('stake1') || inputAddress.startsWith('stake_test1');

  // Create a temporary wallet object to get the network state
  const tempWallet: Wallet = {
    id: 'temp',
    name: 'temp',
    address: inputAddress,
    stakeAddress: isStakeAddress ? inputAddress : '', // Will be populated by getWalletState
    network,
    balance: '0',
    assets: [],
    type: 'SPOOFED',
    hasPassword: false,
    seedPhrase: null,
    rootKey: null,
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

  // Check if the address has a stake address - required for spoof wallets
  if (!state.stakeAddress) {
    throw new Error(
      'This address cannot be used for spoofing. Please provide a base address (one that participates in staking) rather than an enterprise address. Base addresses start with "addr1" or "addr_test1" and have an associated stake address for delegation.',
    );
  }

  // If the address is found, we use the real on-chain data to build the wallet.
  const wallet: Wallet = {
    id: uuidv4(),
    name,
    // For spoofed wallets: address is the input address, stakeAddress is from blockchain
    address: inputAddress,
    stakeAddress: state.stakeAddress,
    network,
    balance: state.balance,
    assets: state.assets,
    type: 'SPOOFED',
    hasPassword: false,
    seedPhrase: null,
    rootKey: null,
  };

  return wallet;
}
