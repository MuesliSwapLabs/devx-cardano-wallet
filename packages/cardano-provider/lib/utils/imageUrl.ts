/**
 * Helper to convert IPFS URLs and handle base64 images
 * Copied from AssetsView.tsx for use in asset syncing
 */
export function getImageUrl(image?: string | unknown): string | undefined {
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
}
