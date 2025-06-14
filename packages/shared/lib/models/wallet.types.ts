export type Wallet = {
  /** A unique, internally-generated ID for the wallet, created by uuid. */
  id: string;

  /** The user-defined, non-unique name for the wallet (e.g., "My Savings"). */
  name: string;

  /** The primary address of the wallet. */
  address: string;

  /** The type of wallet: 'HD' for a normal wallet, 'SPOOFED' for a read-only one. */
  type: 'HD' | 'SPOOFED';

  /** A string representation of the wallet's main currency balance, which will be fetched from the provider. */
  balance: string;

  /** A flag indicating if the wallet is encrypted with a user-provided password. */
  hasPassword: boolean;
};
