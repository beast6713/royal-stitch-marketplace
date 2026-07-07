import { useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { ProductFilters } from '@/lib/types';
import { normalizeProductFilters, filterProducts } from '@/lib/product-core';
import type { Product } from '@/lib/types';

export function useFilters(initialProducts: Product[]) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const serverFilters = normalizeProductFilters(Object.fromEntries(searchParams.entries()));

  const [clientFilters, setClientFilters] = useState<ProductFilters>(serverFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const allProducts = initialProducts;
  const filteredProducts = filterProducts(allProducts, clientFilters);
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    setClientFilters(prev => ({ ...prev, ...newFilters, page: undefined }));
    setCurrentPage(1);
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value as string);
      } else {
        params.delete(key);
      }
    });
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const goToPage = useCallback((page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  }, [totalPages, router, pathname, searchParams]);

  const resetFilters = useCallback(() => {
    setClientFilters({ query: '', material: '', category: '', priceRange: '', rating: '' });
    setCurrentPage(1);
    router.push(pathname);
  }, [router, pathname]);

  return {
    filters: clientFilters,
    products: paginatedProducts,
    totalProducts: filteredProducts.length,
    totalPages,
    currentPage,
    updateFilters,
    goToPage,
    resetFilters,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    serverFilters // for SSR sync
  };
}

