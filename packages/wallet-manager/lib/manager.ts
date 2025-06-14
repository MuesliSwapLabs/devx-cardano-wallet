import { v4 as uuidv4 } from 'uuid';
import type { Wallet } from '@extension/shared';

/**
 * Handles the business logic for creating a new wallet object.
 * This is currently off-chain only.
 */
export function createNewWallet(name: string, password?: string): Wallet {
  // TODO: Future step - call crypto library to generate real keys and address.
  const newAddress = `addr_test_new_${Date.now()}`;
  const wallet: Wallet = { id: uuidv4(), name, address: newAddress, type: 'HD', balance: '0', hasPassword: !!password };
  return wallet;
}

/**
 * Handles the business logic for importing a wallet object.
 */
export function importWallet(name: string, seedPhrase: string, password?: string): Wallet {
  // TODO: Future step - validate seed, derive address, then call blockchain-provider.
  const derivedAddress = `addr_test_imported_${Date.now()}`;
  const wallet: Wallet = {
    id: uuidv4(),
    name,
    address: derivedAddress,
    type: 'HD',
    balance: '0',
    hasPassword: !!password,
  };
  return wallet;
}

/**
 * Handles the business logic for creating a read-only "spoofed" wallet object.
 */
export function spoofWallet(name: string, address: string): Wallet {
  // TODO: Future step - call blockchain-provider to get real balance.
  const wallet: Wallet = { id: uuidv4(), name, address, type: 'SPOOFED', balance: '0', hasPassword: false };
  return wallet;
}
