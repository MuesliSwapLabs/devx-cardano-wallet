// Cardano address types with brand types for type safety

// Base address type - not used directly but provides the string constraint
type CardanoAddress = string & { _brand: 'CardanoAddress' };

// Specific address types
export type StakeAddress = CardanoAddress & { _brand: 'StakeAddress' };
export type BaseAddress = CardanoAddress & { _brand: 'BaseAddress' };
export type EnterpriseAddress = CardanoAddress & { _brand: 'EnterpriseAddress' };

// Union types for different use cases
export type PaymentAddress = BaseAddress | EnterpriseAddress;
export type AnyAddress = StakeAddress | BaseAddress | EnterpriseAddress;

// Type guards for runtime validation
export function isStakeAddress(address: string): address is StakeAddress {
  return address.startsWith('stake1') || address.startsWith('stake_test1');
}

export function isBaseAddress(address: string): address is BaseAddress {
  return address.startsWith('addr1q') || address.startsWith('addr_test1q');
}

export function isEnterpriseAddress(address: string): address is EnterpriseAddress {
  return address.startsWith('addr1v') || address.startsWith('addr_test1v');
}

export function isPaymentAddress(address: string): address is PaymentAddress {
  return isBaseAddress(address) || isEnterpriseAddress(address);
}

export function isValidCardanoAddress(address: string): address is AnyAddress {
  return isStakeAddress(address) || isBaseAddress(address) || isEnterpriseAddress(address);
}

// Safe constructors with validation
export function createStakeAddress(address: string): StakeAddress {
  if (!isStakeAddress(address)) {
    throw new Error(`Invalid stake address format: ${address}`);
  }
  return address;
}

export function createBaseAddress(address: string): BaseAddress {
  if (!isBaseAddress(address)) {
    throw new Error(`Invalid base address format: ${address}`);
  }
  return address;
}

export function createEnterpriseAddress(address: string): EnterpriseAddress {
  if (!isEnterpriseAddress(address)) {
    throw new Error(`Invalid enterprise address format: ${address}`);
  }
  return address;
}

export function createPaymentAddress(address: string): PaymentAddress {
  if (!isPaymentAddress(address)) {
    throw new Error(`Invalid payment address format: ${address}`);
  }
  return address as PaymentAddress;
}

// Address capabilities summary:
// - BaseAddress (addr1q...) - Can receive payments AND has staking capability
// - EnterpriseAddress (addr1v...) - Can receive payments but NO staking
// - StakeAddress (stake1...) - Cannot receive payments, only for rewards/delegation
//
// This is why PaymentAddress = BaseAddress | EnterpriseAddress (both can receive payments)
