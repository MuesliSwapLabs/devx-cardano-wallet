import type { WalletRecord, AssetRecord } from '@extension/storage';
import type { AssetInfo } from '@extension/shared/lib/types/blockfrost';
import { devxSettings, devxData } from '@extension/storage';
import { BlockfrostClient } from '../client/blockfrost';
import { getImageUrl } from '../utils/imageUrl';

/**
 * Helper to decode hex string to ASCII
 */
function hexToAscii(hex: string): string {
  try {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      const charCode = parseInt(hex.substring(i, i + 2), 16);
      // Only add printable ASCII characters
      if (charCode >= 32 && charCode <= 126) {
        str += String.fromCharCode(charCode);
      }
    }
    return str || hex; // Return hex if decoding fails
  } catch {
    return hex;
  }
}

/**
 * Syncs wallet assets using stake address
 * Fetches asset metadata from Blockfrost only for new/changed assets
 * @param wallet - Wallet record to sync
 * @param currentBlockHeight - Current blockchain block height for sync tracking
 * @param existingAssets - Currently stored assets from DB
 * @param onProgress - Optional callback for progress updates (current, total) - only called for new/changed assets
 * @returns Count of new/changed assets that were synced
 */
export async function syncWalletAssets(
  wallet: WalletRecord,
  currentBlockHeight: number,
  existingAssets: AssetRecord[],
  onProgress?: (current: number, total: number) => void,
): Promise<number> {
  try {
    const settings = await devxSettings.get();
    const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;

    if (!apiKey) {
      throw new Error(`No API key configured for ${wallet.network} network`);
    }

    const client = new BlockfrostClient({ apiKey, network: wallet.network });

    // Fetch ALL assets from Blockfrost with pagination
    const allAssets: Array<{ unit: string; quantity: string }> = [];
    let page = 1;

    while (true) {
      const pageAssets = await client.getAccountAddressesAssets(wallet.stakeAddress as any, {
        count: 100,
        page,
      });

      if (pageAssets.length === 0) break;
      allAssets.push(...pageAssets);
      if (pageAssets.length < 100) break; // Stop if less than limit
      page++;
    }

    // Create lookup map from existing DB assets for fast comparison
    const existingAssetsMap = new Map(existingAssets.map(asset => [asset.unit, asset.quantity]));

    // Find new or changed assets
    const newOrChangedAssets = allAssets.filter(bfAsset => {
      const existingQuantity = existingAssetsMap.get(bfAsset.unit);
      // New asset (not in DB) or quantity changed
      return !existingQuantity || existingQuantity !== bfAsset.quantity;
    });

    // If nothing changed, just update block height and return
    if (newOrChangedAssets.length === 0) {
      await devxData.updateWallet(wallet.id, {
        lastFetchedBlockAssets: currentBlockHeight,
      });
      return 0;
    }

    // Fetch metadata only for new/changed assets
    const assetsToStore: AssetRecord[] = [];

    for (let i = 0; i < newOrChangedAssets.length; i++) {
      const asset = newOrChangedAssets[i];

      // Report progress for metadata fetching
      onProgress?.(i + 1, newOrChangedAssets.length);

      try {
        // Fetch full asset metadata
        const assetInfo: AssetInfo = await client.getAssetInfo(asset.unit);

        // Extract policy ID and asset name (hex)
        const policyId = assetInfo.policy_id;
        const assetNameHex = assetInfo.asset_name || '';

        // Get display name and ticker from metadata, with fallback to decoded hex
        const decodedName = hexToAscii(assetNameHex);
        const displayName = assetInfo.metadata?.name || decodedName;
        const ticker = assetInfo.metadata?.ticker || decodedName;

        // Convert logo to URL if available
        const logoUrl = assetInfo.metadata?.logo ? getImageUrl(assetInfo.metadata.logo) : undefined;

        assetsToStore.push({
          walletId: wallet.id,
          unit: asset.unit,
          quantity: asset.quantity, // Our balance, not total supply
          policyId,
          assetName: assetNameHex,
          displayName,
          ticker,
          decimals: assetInfo.metadata?.decimals ?? 0,
          description: assetInfo.metadata?.description,
          logo: assetInfo.metadata?.logo ?? undefined,
          logoUrl,
          website: assetInfo.metadata?.url ?? undefined,
          fingerprint: assetInfo.fingerprint,
        });
      } catch (error) {
        console.error(`Failed to fetch metadata for asset ${asset.unit}:`, error);

        // Fallback: create asset record with minimal info
        const policyId = asset.unit.slice(0, 56);
        const assetNameHex = asset.unit.slice(56);
        const decodedName = hexToAscii(assetNameHex);

        assetsToStore.push({
          walletId: wallet.id,
          unit: asset.unit,
          quantity: asset.quantity,
          policyId,
          assetName: assetNameHex,
          displayName: decodedName,
          ticker: decodedName,
          decimals: 0,
        });
      }
    }

    // Store all assets (this replaces ALL assets for the wallet, not just new ones)
    // We need to merge: keep existing assets that haven't changed + add new/updated ones
    const finalAssets = [
      ...existingAssets.filter(a => !newOrChangedAssets.some(n => n.unit === a.unit)),
      ...assetsToStore,
    ];
    await devxData.storeAssets(wallet.id, finalAssets);

    // Update wallet with latest synced block height
    await devxData.updateWallet(wallet.id, {
      lastFetchedBlockAssets: currentBlockHeight,
    });

    return newOrChangedAssets.length;
  } catch (error) {
    console.error('Failed to sync wallet assets:', error);
    throw error;
  }
}
