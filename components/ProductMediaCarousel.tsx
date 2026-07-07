"use client";

import Image from 'next/image';
import { useState } from 'react';
import type { Product } from '@/lib/types';

interface ProductMediaCarouselProps {
  product: Product;
  className?: string;
  priority?: boolean;
}

export function ProductMediaCarousel({ product, className = "", priority = false }: ProductMediaCarouselProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`relative aspect-[4/5] overflow-hidden bg-[#ede3d7] rounded-t-[22px] ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Image
        src={product.imageUrl}
        alt={`${product.name} - view 1`}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
        className={`object-cover transition-transform duration-700 ${isHovered ? 'scale-[1.06]' : 'scale-100'}`}
        priority={priority}
      />
      
      {/* Hover scrim */}
      <div className={`absolute inset-0 bg-gradient-to-t from-royal/20 via-transparent to-transparent transition-opacity duration-500 z-20 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}
