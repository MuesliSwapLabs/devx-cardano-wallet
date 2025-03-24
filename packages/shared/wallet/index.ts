import { Wallet, CardanoAddress } from './types';
import * as bf from './blockfrost';

// packages/shared/wallet/index.ts
export function getCurrentPrice(): Number {
  return Math.floor(Math.random() * 1000);
}

// add wallet
export function createNewWallet(name: string, password: string): Wallet {
  // Use blockfrost or whatever to get new address:
  const address = bf.createWallet();
  console.log('foo name', name, password);
  var newWallet: Wallet = {
    address: address,
    name: name,
    password: password,
  };

  return newWallet;
}
