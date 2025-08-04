export type Wallet = {
  id: string;
  name: string;
  address: string;
  network: 'Mainnet' | 'Preprod';
  balance: string; // In Lovelaces
  assets: Asset[];
  type: 'HD' | 'SPOOFED';
  hasPassword: boolean;
  // Encrypted seed phrase for HD, null for SPOOFED
  secret: string | null;
};

export type Asset = {
  unit: string;
  quantity: string;
};
