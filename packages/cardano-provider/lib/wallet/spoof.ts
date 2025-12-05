import { v4 as uuidv4 } from 'uuid';
import type { Wallet } from '@extension/shared';
import { getWalletState } from './state';

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

  // For spoofed wallets, 'not_found' is acceptable - it just means the wallet doesn't exist on-chain yet
  // We'll create the wallet with default values and the stake address we can determine
  if (state.status === 'not_found') {
    // For new wallets, we still need a stake address to make it functional
    // If we couldn't get one from getWalletState, we can't create a functional spoof wallet
    if (!state.stakeAddress && !isStakeAddress) {
      throw new Error(
        'Cannot create spoof wallet: unable to determine stake address for this payment address. ' +
          'The address may be invalid or the wallet may not exist on the blockchain yet. ' +
          'Try again after the wallet receives its first transaction.',
      );
    }

    // Create wallet with default values for new wallets
    const wallet: Wallet = {
      id: uuidv4(),
      name,
      address: inputAddress,
      stakeAddress: isStakeAddress ? inputAddress : state.stakeAddress || '',
      network,
      balance: '0', // New wallets start with 0 balance
      type: 'SPOOFED',
      hasPassword: false,
      seedPhrase: null,
      rootKey: null,
    };

    return wallet;
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
    type: 'SPOOFED',
    hasPassword: false,
    seedPhrase: null,
    rootKey: null,
  };

  return wallet;
}
