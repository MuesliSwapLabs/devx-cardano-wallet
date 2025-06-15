export type Wallet = {
  id: string;
  name: string;
  address: string;
  type: 'HD' | 'SPOOFED';
  balance: string;
  hasPassword: boolean;
  /**
   * Stores the secret data.
   * - If `hasPassword` is true, this holds the encrypted seed phrase.
   * - If `hasPassword` is false, this holds the plaintext seed phrase.
   * - This is null for spoofed wallets.
   */
  secret: string | null;
};
