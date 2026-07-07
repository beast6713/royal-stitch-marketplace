import Image from 'next/image';

interface CloudinaryLoaderProps {
  src: string;
  width: number;
  quality?: number;
  format?: 'webp' | 'avif';
}

export default function cloudinaryLoader({ src, width, quality = 80, format = 'webp' }: CloudinaryLoaderProps) {
  if (src.startsWith('/') || src.includes('unsplash.com')) {
    return src;
  }

  // Handle existing Cloudinary URLs
  if (src.includes('res.cloudinary.com')) {
    return `${src}?w=${width}&q=${quality}&f=${format}`;
  }

  // Transform external URLs via Cloudinary image/fetch
  const publicId = encodeURIComponent(src);
  return `https://res.cloudinary.com/demo/image/fetch/w_${width},q_${quality},f_${format}/${publicId}`;
}

