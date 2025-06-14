import { v4 as uuidv4 } from 'uuid';
import type { Wallet } from '@extension/shared';

/**
 * Creates a new wallet object.
 * This function will eventually contain complex crypto and on-chain logic.
 */
export function createNewWallet(name: string, password?: string): Wallet {
  console.log('[WalletManager]: Running business logic for CREATE...');
  // TODO: In the future, this is where you'll generate real keys.
  const wallet: Wallet = {
    id: uuidv4(),
    name,
    address: `addr_test_new_${Date.now()}`,
    type: 'HD',
    balance: '0',
    hasPassword: !!password,
  };
  return wallet;
}

/**
 * Creates a wallet object from an import.
 */
export function importWallet(name: string, seedPhrase: string, password?: string): Wallet {
  console.log('[WalletManager]: Running business logic for IMPORT...');
  // TODO: In the future, this is where you'll validate the seed and derive the address.
  const wallet: Wallet = {
    id: uuidv4(),
    name,
    address: `addr_test_imported_${Date.now()}`,
    type: 'HD',
    balance: '0',
    hasPassword: !!password,
  };
  return wallet;
}

/**
 * Creates a read-only "spoofed" wallet object.
 */
export function spoofWallet(name: string, address: string): Wallet {
  console.log('[WalletManager]: Running business logic for SPOOF...');
  // TODO: In the future, this is where you'll call the blockchain-provider.
  const wallet: Wallet = {
    id: uuidv4(),
    name,
    address,
    type: 'SPOOFED',
    balance: '0',
    hasPassword: false,
  };
  return wallet;
}
