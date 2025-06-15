// packages/wallet-manager/lib/manager.ts
import { v4 as uuidv4 } from 'uuid';
import type { Wallet } from '@extension/shared';
import { encrypt } from '@extension/shared';

export async function createNewWallet(name: string, password?: string): Promise<Wallet> {
  // TODO: Replace with real seed phrase generation
  const seedPhrase = 'example super secret seed phrase for a new wallet';
  const newAddress = `addr_test_new_${Date.now()}`;

  const wallet: Wallet = {
    id: uuidv4(),
    name,
    address: newAddress,
    type: 'HD',
    balance: '0',
    hasPassword: !!password,
    // Store the secret encrypted if a password exists, otherwise store it in plaintext.
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
    type: 'HD',
    balance: '0',
    hasPassword: !!password,
    secret: password ? await encrypt(seedPhrase, password) : seedPhrase,
  };
  return wallet;
}

export function spoofWallet(name: string, address: string): Wallet {
  return {
    id: uuidv4(),
    name,
    address,
    type: 'SPOOFED',
    balance: '0',
    hasPassword: false,
    secret: null, // Spoofed wallets have no secret
  };
}
