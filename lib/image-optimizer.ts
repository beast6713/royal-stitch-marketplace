/**
 * A simple utility to transform existing image URLs into optimized CDN links.
 * Used for dynamic image optimization as an additive layer constraint.
 */
export function getOptimizedImageUrl(originalUrl: string, width = 800): string {
  // If no URL or already a data URI/blob, ignore
  if (!originalUrl || originalUrl.startsWith("data:") || originalUrl.startsWith("blob:")) {
    return originalUrl;
  }

  // If already hosted on Cloudinary or unoptimizeable, skip wrapping
  if (originalUrl.includes("res.cloudinary.com") || originalUrl.endsWith(".avif") || originalUrl.endsWith(".webp")) {
    return originalUrl;
  }

  // Default Cloudinary anonymous optimization fetch API format:
  // Note: This relies on a properly configured fetch proxy or just generic resize tools. 
  // In a real project, this would be `https://res.cloudinary.com/<CLOUD_NAME>/image/fetch/`
  // We use Unsplash or an open fetcher as a proxy mockup to demonstrate the layer principle.
  return `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}&w=${width}&output=webp&q=80`;
}
