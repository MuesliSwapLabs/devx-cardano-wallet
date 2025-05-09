// TODO: Maybe replace with actual type
export type CardanoAddress = string & { __brand: 'CardanoAddress' };

export interface Wallet {
  address: CardanoAddress;
  name: string;
  password?: string | undefined;
}
