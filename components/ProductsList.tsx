"use client";

import { useTransition, Suspense } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ProductCard } from './product-card';
import { SkeletonProductCard } from './SkeletonProductCard';
import { useProducts } from '../hooks/useProducts';
import { cn } from '../lib/utils';
import type { Product } from '../lib/types';

interface ProductsListProps {
  initialProducts?: Product[]; // No longer hard required as API takes over
  defaultCategory?: string; // Used for static SSG category pipelines
  className?: string;
}

export function ProductsList({ initialProducts, defaultCategory, className }: ProductsListProps) {
  const initialData = initialProducts ? {
    products: initialProducts,
    total: initialProducts.length,
    page: 1,
    limit: initialProducts.length,
    totalPages: 1,
    facets: { categories: {}, materials: {} }
  } : undefined;

  const {
    products,
    totalProducts,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    resetFilters,
    isLoading
  } = useProducts({ defaultCategory, initialData });

  return (
    <div className={cn("space-y-8", className)}>
      {/* Results header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold text-royal">
            {totalProducts} handmade {totalProducts === 1 ? 'piece' : 'pieces'}
          </p>
          <p className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={!hasPrevPage || isLoading}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-royal shadow-sm transition hover:bg-royal hover:text-white disabled:opacity-50 disabled:hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={!hasNextPage || isLoading}
            className="flex items-center gap-2 rounded-full bg-royal px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-royal-soft disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Product grid */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }, (_, i) => (
            <SkeletonProductCard key={i} />
          ))
        ) : (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-royal" />
          <span className="text-sm text-slate-600">Loading listings...</span>
        </div>
      )}

      {!isLoading && totalProducts === 0 && (
        <div className="text-center py-24">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#f7efe5] text-royal">
            <span className="text-3xl">🎁</span>
          </div>
          <h3 className="mt-6 text-2xl font-semibold text-royal">No matches found</h3>
          <p className="mt-3 text-sm text-slate-600 max-w-md mx-auto">
            Try different filters or browse all handmade pieces.
          </p>
          <button
            onClick={resetFilters}
            className="button-primary mt-6"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

