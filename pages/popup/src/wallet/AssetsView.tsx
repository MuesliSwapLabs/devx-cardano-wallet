import { useState, useEffect } from 'react';
import { useSearchParams, useLoaderData, useParams } from 'react-router-dom';
import type { Asset } from '@extension/shared';
import { devxSettings, devxData } from '@extension/storage';
import { BlockfrostClient, syncWalletAssets } from '@extension/cardano-provider';

// Helper to format token amounts with decimals
const formatTokenAmount = (quantity: string, decimals: number = 0) => {
  const amount = parseInt(quantity, 10);
  if (decimals > 0) {
    const formatted = (amount / Math.pow(10, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
    return formatted;
  }
  return amount.toLocaleString();
};

// Helper to convert IPFS URLs and handle base64 images
const getImageUrl = (image?: string | unknown) => {
  // Type guard - ensure image is a string
  if (!image || typeof image !== 'string' || image.trim() === '') {
    return undefined;
  }

  const imageStr = image.trim();

  // Handle IPFS URLs
  if (imageStr.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${imageStr.slice(7)}`;
  }

  // Handle data URLs (base64 images)
  if (imageStr.startsWith('data:image/')) {
    return imageStr;
  }

  // Handle raw base64 (add data URL prefix)
  if (imageStr.startsWith('iVBOR') || imageStr.startsWith('/9j/') || imageStr.startsWith('UklGR')) {
    return `data:image/png;base64,${imageStr}`;
  }

  // Return HTTP/HTTPS URLs as-is
  if (imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
    return imageStr;
  }

  // If it's not a recognized format, return undefined to show placeholder
  return undefined;
};

// SVG placeholder for missing images
const getPlaceholderSvg = (name: string, isToken: boolean = true) => {
  const initials = name.slice(0, 2).toUpperCase();
  const colors = isToken
    ? ['#3B82F6', '#1D4ED8'] // Blue gradient for tokens
    : ['#8B5CF6', '#7C3AED']; // Purple gradient for NFTs

  return `data:image/svg+xml;base64,${btoa(`
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill="url(#grad)" rx="8"/>
      <text x="32" y="40" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="white" text-anchor="middle">${initials}</text>
    </svg>
  `)}`;
};

const TokenDisplay = ({ asset }: { asset: Asset }) => {
  const [hasError, setHasError] = useState(false);
  const imageUrl = asset.logoUrl || getImageUrl(asset.logo || asset.image);
  const placeholderUrl = getPlaceholderSvg(asset.displayName, true);

  return (
    <div className="flex items-center justify-between border-b border-gray-200 p-3 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <img
          src={!hasError && imageUrl ? imageUrl : placeholderUrl}
          alt={asset.displayName}
          className="size-8 rounded-full"
          onError={() => setHasError(true)}
        />
        <div>
          <div className="text-sm font-medium">{asset.displayName}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold">
          {formatTokenAmount(asset.quantity, asset.decimals)}{' '}
          <span className="text-gray-500 dark:text-gray-400">{asset.ticker}</span>
        </div>
      </div>
    </div>
  );
};

const NFTDisplay = ({ asset }: { asset: Asset }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const imageUrl = getImageUrl(asset.image);

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setRetryKey(prev => prev + 1); // Force img re-render
  };

  // Timeout after 15 seconds
  useEffect(() => {
    if (asset.image && isLoading) {
      const timeout = setTimeout(() => {
        setIsLoading(false);
        setHasError(true);
      }, 15000);

      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [asset.image, isLoading]);

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 p-3 dark:border-gray-700">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
        {asset.image ? (
          <>
            {/* Loading spinner */}
            {isLoading && !hasError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                <div className="size-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              </div>
            )}

            {/* Image */}
            <img
              key={retryKey} // Force re-render on retry
              src={imageUrl}
              alt={asset.displayName}
              className={`size-full object-cover transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              loading="lazy"
              onLoad={() => {
                setIsLoading(false);
                setHasError(false);
              }}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />

            {/* Error fallback with placeholder */}
            {hasError && (
              <div className="absolute inset-0">
                <img
                  src={getPlaceholderSvg(asset.displayName, false)}
                  alt={asset.displayName}
                  className="size-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black bg-opacity-50 px-1 py-0.5 text-xs text-white">
                  <span>Error</span>
                  <button onClick={handleRetry} className="text-blue-300 underline hover:no-underline">
                    retry
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <img
            src={getPlaceholderSvg(asset.displayName, false)}
            alt={asset.displayName}
            className="size-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{asset.displayName}</div>
        {asset.description && (
          <div className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{asset.description}</div>
        )}
        <div className="mt-1 text-xs text-gray-400">Qty: {asset.quantity}</div>
      </div>
    </div>
  );
};

const AssetsView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { assets: loaderAssets, lastFetchedBlockAssets } = useLoaderData() as {
    assets: Asset[];
    lastFetchedBlockAssets: number;
  };
  const { walletId } = useParams<{ walletId: string }>();

  const [assets, setAssets] = useState(loaderAssets);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'uptodate' | null>(null);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    // Only run sync once per mount
    if (hasSynced) {
      return;
    }

    const checkAndSync = async () => {
      if (!walletId) return;

      try {
        const settings = await devxSettings.get();
        const wallet = await devxData.getWallet(walletId);
        if (!wallet) return;

        const apiKey = wallet.network === 'Mainnet' ? settings.mainnetApiKey : settings.preprodApiKey;
        if (!apiKey) return;

        const client = new BlockfrostClient({ apiKey, network: wallet.network });
        const latestBlock = await client.getLatestBlock();

        if (latestBlock.height && latestBlock.height > lastFetchedBlockAssets) {
          // Show syncing status immediately before fetching
          setSyncStatus('syncing');

          // Sync assets and get count of new/changed assets
          const changedCount = await syncWalletAssets(
            wallet,
            latestBlock.height,
            loaderAssets as any, // Pass existing assets from loader
            (current, total) => {
              // Update progress during metadata fetching
              setSyncProgress({ current, total });
            },
          );

          // Refresh assets display if anything changed
          if (changedCount > 0) {
            const freshAssets = await devxData.getWalletAssets(walletId);
            setAssets(freshAssets);
          }

          // Always show green "up to date" after syncing
          setSyncStatus('uptodate');
          setShouldAnimate(false);
          setTimeout(() => setShouldAnimate(true), 10);
        } else {
          // Already up to date - show green box briefly
          setSyncStatus('uptodate');
          setShouldAnimate(false);
          setTimeout(() => setShouldAnimate(true), 10);
        }

        setHasSynced(true);
      } catch (error) {
        console.error('Failed to check/sync assets:', error);
        setSyncStatus(null);
      }
    };

    checkAndSync();
  }, [walletId]); // Only depend on walletId, not lastFetchedBlockAssets

  // Get tab from URL params, default to 'tokens'
  const activeTab = (searchParams.get('tab') as 'tokens' | 'nfts') || 'tokens';

  // Categorize assets: quantity < 10 = NFT, else Token
  const tokens = assets.filter(asset => parseInt(asset.quantity, 10) >= 10);
  const nfts = assets.filter(asset => parseInt(asset.quantity, 10) < 10);

  return (
    <div className="flex h-full flex-col">
      {/* Tab switcher */}
      <div className="mb-4 flex border-b border-gray-300 dark:border-gray-600">
        <button
          onClick={() => {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set('tab', 'tokens');
            setSearchParams(newSearchParams);
          }}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'tokens'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}>
          Tokens ({tokens.length})
        </button>
        <button
          onClick={() => {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set('tab', 'nfts');
            setSearchParams(newSearchParams);
          }}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'nfts'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}>
          NFTs ({nfts.length})
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'tokens' ? (
          tokens.length > 0 ? (
            <div>
              {tokens.map(asset => (
                <TokenDisplay key={asset.unit} asset={asset} />
              ))}
            </div>
          ) : (
            <p className="mt-8 text-center text-sm text-gray-400">No tokens found in this wallet.</p>
          )
        ) : nfts.length > 0 ? (
          <div>
            {nfts.map(asset => (
              <NFTDisplay key={asset.unit} asset={asset} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-gray-400">No NFTs found in this wallet.</p>
        )}
      </div>

      {/* Sync status notification - fixed above bottom nav */}
      {syncStatus && (
        <div
          className={`fixed inset-x-0 bottom-16 z-10 px-4 py-2 text-center text-xs text-white shadow-lg ${
            syncStatus === 'syncing' ? 'bg-blue-600' : `bg-green-600 ${shouldAnimate ? 'animate-fade-out-delayed' : ''}`
          }`}
          onAnimationEnd={() => {
            if (syncStatus === 'uptodate') {
              setSyncStatus(null);
              setShouldAnimate(false);
            }
          }}>
          {syncStatus === 'syncing' ? (
            <span>
              {syncProgress.total > 0 ? `Syncing ${syncProgress.current}/${syncProgress.total}...` : 'Syncing...'}
            </span>
          ) : (
            <span>✓ Up to date</span>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetsView;
