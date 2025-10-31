/**
 * Address utility functions for determining address types and ownership
 */

/**
 * Checks if an address is a script address (not controlled by a private key)
 * Script addresses use script hashes for payment credentials and cannot be derived from HD wallets
 * @param address - Bech32 encoded Cardano address
 * @returns true if address is a script address, false otherwise
 */
function isScriptAddress(address: string): boolean {
  // addr1z / addr_test1z = base address with script hash + stake key
  // addr1x / addr_test1x = script address without stake key
  return (
    address.startsWith('addr1z') ||
    address.startsWith('addr_test1z') ||
    address.startsWith('addr1x') ||
    address.startsWith('addr_test1x')
  );
}

/**
 * Determines if an address is external to the wallet
 * An address is external if:
 * 1. It's a script address (z/x types) - even if it uses the wallet's stake key
 * 2. It's not in the wallet's payment addresses list
 *
 * An address is owned by the wallet if:
 * - It's a non-script address (q/e/v types) AND
 * - It's in the wallet's payment addresses list
 *
 * @param address - Bech32 encoded Cardano address to check
 * @param paymentAddresses - List of payment addresses belonging to the wallet
 * @returns true if address is external, false if owned by wallet
 */
export function isExternalAddress(address: string, paymentAddresses: string[]): boolean {
  // Scripts (z/x) are always external, even if they share our stake key
  if (isScriptAddress(address)) {
    return true;
  }

  // Not in our payment addresses = external
  if (!paymentAddresses.includes(address)) {
    return true;
  }

  // q/e/v type AND in our payment addresses = NOT external (we own it)
  return false;
}
