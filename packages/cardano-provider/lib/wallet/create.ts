import { v4 as uuidv4 } from 'uuid';
import type { Wallet } from '@extension/shared';
import { encrypt } from '@extension/shared';

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
    type: 'HD',
    hasPassword: !!password,
    seedPhrase: password ? await encrypt(seedPhrase, password) : seedPhrase,
    rootKey: rootKey ? (password ? await encrypt(rootKey, password) : rootKey) : null,
  };
  return wallet;
}
