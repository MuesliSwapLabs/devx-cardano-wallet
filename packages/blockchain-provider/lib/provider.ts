import { Asset } from '@extension/shared';
import { settingsStorage } from '@extension/storage';

const BLOCKFROST_API_KEY = 'preprodUCRP6WTpWi0DXWZF4eduE2VZPod9CjAJ';

// --- Type Definitions ---
// The final, rich asset information we want to return
export interface EnrichedAsset extends Asset {
  policyId: string;
  name: string;
}

// The final state of the entire wallet
export interface WalletState {
  status: 'found' | 'not_found' | 'invalid_address';
  address: string;
  stakeAddress: string | null;
  balance: string; // Lovelace
  assets: EnrichedAsset[];
}

// Blockfrost API response types
type BlockfrostAmount = {
  unit: string;
  quantity: string;
};

type AddressInfoResponse = {
  address: string;
  amount: BlockfrostAmount[];
  stake_address: string | null;
  type: 'shelley';
  script: boolean;
};

type AccountInfoResponse = {
  stake_address: string;
  controlled_amount: string; // This is the total lovelace balance
};

const BLOCKFROST_API_URLS = {
  Mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0',
  Preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
};

// --- Helper Functions ---

/**
 * Reads the current network from settings and returns the correct Blockfrost API base URL.
 */
async function getApiUrlForCurrentNetwork(): Promise<string> {
  const settings = await settingsStorage.get();
  const network = settings.network;
  const apiUrl = BLOCKFROST_API_URLS[network];
  if (!apiUrl) {
    throw new Error(`Unsupported network: ${network}`);
  }
  return apiUrl;
}

/**
 * A simple client-side check for address format.
 */
function isValidAddressFormat(address: string): boolean {
  return address.startsWith('addr1') || address.startsWith('addr_test1');
}

/**
 * Fetches the stake address associated with a given payment address.
 * Handles the case where the address is valid but has no on-chain history (404).
 */
async function getStakeAddress(
  apiUrl: string,
  paymentAddress: string,
): Promise<{ stakeAddress: string | null; status: 'found' | 'not_found' }> {
  const endpoint = `${apiUrl}/addresses/${paymentAddress}`;
  const response = await fetch(endpoint, {
    headers: { project_id: BLOCKFROST_API_KEY },
  });

  if (response.status === 404) {
    return { stakeAddress: null, status: 'not_found' };
  }
  if (!response.ok) {
    throw new Error(`Blockfrost API request failed: ${response.statusText}`);
  }

  const data: AddressInfoResponse = await response.json();
  return { stakeAddress: data.stake_address, status: 'found' };
}

/**
 * Fetches the total ADA balance for an entire account via its stake address.
 */
async function getAccountBalance(apiUrl: string, stakeAddress: string): Promise<string> {
  const endpoint = `${apiUrl}/accounts/${stakeAddress}`;
  const response = await fetch(endpoint, {
    headers: { project_id: BLOCKFROST_API_KEY },
  });
  if (!response.ok) throw new Error(`Failed to fetch account balance: ${response.statusText}`);
  const data: AccountInfoResponse = await response.json();
  return data.controlled_amount;
}

/**
 * Fetches all unique native assets for an entire account via its stake address.
 */
async function getAccountAssets(apiUrl: string, stakeAddress: string): Promise<Asset[]> {
  const endpoint = `${apiUrl}/accounts/${stakeAddress}/addresses/assets`;
  const response = await fetch(endpoint, {
    headers: { project_id: BLOCKFROST_API_KEY },
  });
  if (!response.ok) throw new Error(`Failed to fetch account assets: ${response.statusText}`);
  const data: Asset[] = await response.json();
  // Blockfrost returns ADA as an asset here, so we filter it out.
  return data.filter(asset => asset.unit !== 'lovelace');
}

/**
 * Converts a hex string to a UTF-8 readable string.
 */
function hexToString(hex: string): string {
  // NOTE: Not sure if that's a good idea...
  if (!hex || hex.length % 2 !== 0) {
    return hex; // Return original hex if it's invalid or empty
  }
  try {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return hex; // Fallback to returning the hex on error
  }
}

// --- Main Exported Function ---

/**
 * Fetches the complete state of a wallet (total balance and all assets)
 * by looking up the stake key associated with a given payment address.
 * @param address A payment address (addr1...) from the wallet.
 * @returns A promise that resolves to a WalletState object.
 */
export const getWalletState = async (address: string): Promise<WalletState> => {
  if (!isValidAddressFormat(address)) {
    return {
      status: 'invalid_address',
      address,
      stakeAddress: null,
      balance: '0',
      assets: [],
    };
  }

  const apiUrl = await getApiUrlForCurrentNetwork();
  const { stakeAddress, status } = await getStakeAddress(apiUrl, address);

  if (status === 'not_found') {
    return {
      status: 'not_found',
      address,
      stakeAddress: null,
      balance: '0',
      assets: [],
    };
  }

  if (!stakeAddress) {
    // This can happen if the address is valid but has no associated stake key (e.g., some scripts)
    // For our purpose, we treat it as having no account-wide data to fetch.
    return {
      status: 'found',
      address,
      stakeAddress: null,
      balance: '0',
      assets: [],
    };
  }

  try {
    // Fetch balance and assets in parallel for efficiency
    const [balance, rawAssets] = await Promise.all([
      getAccountBalance(apiUrl, stakeAddress),
      getAccountAssets(apiUrl, stakeAddress),
    ]);

    // Enrich asset data with readable names and policy IDs
    const enrichedAssets: EnrichedAsset[] = rawAssets.map(asset => {
      const policyId = asset.unit.slice(0, 56);
      const hexName = asset.unit.slice(56);
      console.log(`Enriching asset: ${asset.unit} with policyId: ${policyId} and hexName: ${hexName}`);
      return {
        ...asset,
        policyId,
        name: hexToString(hexName),
      };
    });

    return {
      status: 'found',
      address,
      stakeAddress,
      balance,
      assets: enrichedAssets,
    };
  } catch (error) {
    console.error('Failed to fetch full wallet state:', error);
    // Return a default error state
    return {
      status: 'not_found',
      address,
      stakeAddress,
      balance: '0',
      assets: [],
    };
  }
};
