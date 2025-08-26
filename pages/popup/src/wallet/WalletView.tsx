import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStorage, walletsStorage } from '@extension/storage';
import { Wallet, Asset } from '@extension/shared';
import EnhancedTransactions from './EnhancedTransactions';
import UTXOsView from './UTXOsView';

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
  const imageUrl = getImageUrl(asset.logo || asset.image);
  const placeholderUrl = getPlaceholderSvg(asset.name, true);

  return (
    <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <img
          src={!hasError && imageUrl ? imageUrl : placeholderUrl}
          alt={asset.name}
          className="w-8 h-8 rounded-full"
          onError={() => setHasError(true)}
        />
        <div>
          <div className="font-medium text-sm">{asset.name}</div>
          {asset.ticker && <div className="text-xs text-gray-500 dark:text-gray-400">{asset.ticker}</div>}
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold">{formatTokenAmount(asset.quantity, asset.decimals)}</div>
        {asset.ticker && <div className="text-xs text-gray-500 dark:text-gray-400">{asset.ticker}</div>}
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
  }, [asset.image, isLoading]);

  return (
    <div className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-700">
      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 relative">
        {asset.image ? (
          <>
            {/* Loading spinner */}
            {isLoading && !hasError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Image */}
            <img
              key={retryKey} // Force re-render on retry
              src={imageUrl}
              alt={asset.name}
              className={`w-full h-full object-cover transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
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
                  src={getPlaceholderSvg(asset.name, false)}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 flex justify-between items-center">
                  <span>Error</span>
                  <button onClick={handleRetry} className="text-blue-300 underline hover:no-underline">
                    retry
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <img src={getPlaceholderSvg(asset.name, false)} alt={asset.name} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{asset.name}</div>
        {asset.description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{asset.description}</div>
        )}
        <div className="text-xs text-gray-400 mt-1">Qty: {asset.quantity}</div>
      </div>
    </div>
  );
};

const WalletView = () => {
  const { walletId, view = 'assets' } = useParams();
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');
  const walletsData = useStorage(walletsStorage);
  const wallets = walletsData?.wallets || [];
  const wallet = wallets.find((w: Wallet) => w.id === walletId);

  if (!wallet) {
    return <div>Loading wallet...</div>;
  }

  // Categorize assets: quantity < 10 = NFT, else Token
  const tokens = wallet.assets?.filter(asset => parseInt(asset.quantity, 10) >= 10) || [];
  const nfts = wallet.assets?.filter(asset => parseInt(asset.quantity, 10) < 10) || [];

  return (
    // This component now only contains the content for the <Outlet />
    // The main balance and wallet info is already in MainLayout.
    <div className="flex flex-col h-full">
      {view === 'assets' && (
        <div className="flex flex-col h-full">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-300 dark:border-gray-600 mb-4">
            <button
              onClick={() => setActiveTab('tokens')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'tokens'
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}>
              Tokens ({tokens.length})
            </button>
            <button
              onClick={() => setActiveTab('nfts')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'nfts'
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
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
                <p className="text-sm text-gray-400 mt-8 text-center">No tokens found in this wallet.</p>
              )
            ) : nfts.length > 0 ? (
              <div>
                {nfts.map(asset => (
                  <NFTDisplay key={asset.unit} asset={asset} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-8 text-center">No NFTs found in this wallet.</p>
            )}
          </div>
        </div>
      )}

      {view === 'enhanced-transactions' && <EnhancedTransactions wallet={wallet} />}

      {view === 'utxos' && <UTXOsView wallet={wallet} />}
    </div>
  );
};

export default WalletView;
