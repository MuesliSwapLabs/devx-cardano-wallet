import { v4 as uuidv4 } from 'uuid';
import type { Wallet } from '@extension/shared';
import { encrypt } from '@extension/shared';

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
    type: 'HD',
    hasPassword: !!password,
    seedPhrase: password ? await encrypt(seedPhrase, password) : seedPhrase,
    rootKey: rootKey ? (password ? await encrypt(rootKey, password) : rootKey) : null,
  };
  return wallet;
}
