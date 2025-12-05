import type { Wallet, WalletState, Asset } from '@extension/shared';
import { BlockfrostClient } from '../client/blockfrost';
import { devxSettings } from '@extension/storage';
import { BlockfrostError } from '@extension/shared/lib/types/errors';

/**
 * Validates if an address has a valid Cardano format
 */
function isValidAddressFormat(address: string): boolean {
  return (
    address.startsWith('addr1') ||
    address.startsWith('addr_test1') ||
    address.startsWith('stake1') ||
    address.startsWith('stake_test1')
  );
}

/**
 * Converts a hex string to a UTF-8 readable string
 */
function hexToString(hex: string): string {
  if (!hex || hex.length % 2 !== 0) {
    return hex;
  }
  try {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return hex;
  }
}

/**
 * Fetches the complete state of a wallet (balance and assets) from the blockchain.
 *
 * This function provides a snapshot of the wallet's current on-chain state by:
 * 1. Validating the address format
 * 2. Getting the stake address (if not already known)
 * 3. Fetching balance and assets from Blockfrost
 * 4. Enriching assets with metadata
 *
 * @param wallet - The wallet object containing address and network information
 * @returns A promise that resolves to a WalletState object
 */
export async function getWalletState(wallet: Wallet): Promise<WalletState> {
  const address = wallet.address;

  // Validate address format first
  if (!isValidAddressFormat(address)) {
    return {
      status: 'invalid_address',
      address,
      stakeAddress: null,
      balance: '0',
      assets: [],
    };
  }

  // Get API configuration
  const settings = await devxSettings.get();
  const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

  if (!apiKey) {
    console.error(`No API key configured for ${wallet.network} network`);
    return {
      status: 'not_found',
      address,
      stakeAddress: wallet.stakeAddress || null,
      balance: '0',
      assets: [],
    };
  }

  const client = new BlockfrostClient({ apiKey, network: wallet.network });

  // Determine stake address if not already known
  let stakeAddress: string | null = wallet.stakeAddress;

  if (!stakeAddress) {
    try {
      const addressInfo = await client.getAddressInfo(address as any);
      stakeAddress = addressInfo.stake_address;
    } catch (error) {
      // If address not found on chain (404), it's a new wallet
      if (error instanceof BlockfrostError && error.statusCode === 404) {
        return {
          status: 'not_found',
          address,
          stakeAddress: null,
          balance: '0',
          assets: [],
        };
      }
      console.error('Error fetching address info:', error);
      return {
        status: 'not_found',
        address,
        stakeAddress: null,
        balance: '0',
        assets: [],
      };
    }
  }

  // If no stake address found (e.g., enterprise address), return with zero balance
  if (!stakeAddress) {
    return {
      status: 'found',
      address,
      stakeAddress: null,
      balance: '0',
      assets: [],
    };
  }

  // Fetch balance and assets from blockchain
  try {
    const [accountInfo, rawAssets] = await Promise.all([
      client.getAccountInfo(stakeAddress as any),
      client.getAccountAddressesAssets(stakeAddress as any),
    ]);

    // Enrich assets with metadata
    const enrichedAssets: Asset[] = await Promise.all(
      rawAssets.map(async asset => {
        const policyId = asset.unit.slice(0, 56);
        const hexName = asset.unit.slice(56);

        // Fetch metadata for this asset
        let metadata: Partial<Asset> = {};
        try {
          const assetInfo = await client.getAssetInfo(asset.unit);

          // Extract metadata from Blockfrost response
          if (assetInfo.metadata) {
            metadata = {
              displayName: assetInfo.metadata.name || hexToString(hexName),
              ticker: assetInfo.metadata.ticker || undefined,
              description: assetInfo.metadata.description || undefined,
              logo: assetInfo.metadata.logo || undefined,
              decimals: assetInfo.metadata.decimals ?? undefined,
            };
          }

          // Extract on-chain metadata
          if (assetInfo.onchain_metadata) {
            const onchainMeta = assetInfo.onchain_metadata;
            metadata.displayName = metadata.displayName || onchainMeta.name || hexToString(hexName);
            metadata.description = metadata.description || onchainMeta.description;
            metadata.image = onchainMeta.image;
            metadata.mediaType = onchainMeta.mediaType;
            metadata.attributes = onchainMeta.attributes;
          }

          // Add other Blockfrost data
          metadata.fingerprint = assetInfo.fingerprint;
          metadata.firstMintTx = assetInfo.initial_mint_tx_hash;
          metadata.mintCount = assetInfo.mint_or_burn_count?.toString();
        } catch (error) {
          console.warn(`Failed to fetch metadata for asset ${asset.unit}:`, error);
        }

        return {
          unit: asset.unit,
          quantity: asset.quantity,
          policyId,
          assetName: hexName,
          displayName: metadata.displayName || hexToString(hexName),
          ticker: metadata.ticker,
          decimals: metadata.decimals,
          description: metadata.description,
          image: metadata.image,
          logo: metadata.logo,
          mediaType: metadata.mediaType,
          attributes: metadata.attributes,
          fingerprint: metadata.fingerprint,
          firstMintTx: metadata.firstMintTx,
          mintCount: metadata.mintCount,
          lastUpdated: Date.now(),
        };
      }),
    );

    return {
      status: 'found',
      address,
      stakeAddress,
      balance: accountInfo.controlled_amount,
      assets: enrichedAssets,
    };
  } catch (error) {
    // Handle 404 errors (account not found) - expected for new wallets
    if (error instanceof BlockfrostError && error.statusCode === 404) {
      return {
        status: 'not_found',
        address,
        stakeAddress,
        balance: '0',
        assets: [],
      };
    }

    console.error('Failed to fetch wallet state:', error);
    return {
      status: 'not_found',
      address,
      stakeAddress,
      balance: '0',
      assets: [],
    };
  }
}
