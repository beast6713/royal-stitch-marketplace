"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Product, ProductFilters } from '@/lib/types';
import { normalizeProductFilters } from '@/lib/product-core';

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: {
    categories: Record<string, number>;
    materials: Record<string, number>;
  };
  sourceState?: string;
  errorMessage?: string;
}

export function useProducts({ defaultCategory, initialData }: { defaultCategory?: string, initialData?: ProductsResponse } = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<ProductsResponse | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [didHydrate, setDidHydrate] = useState(false);

  const activeFilters = normalizeProductFilters(Object.fromEntries(searchParams.entries()));
  if (defaultCategory && !activeFilters.category) {
    activeFilters.category = defaultCategory as any;
  }
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    // Skip fetching on first mount if we have valid initialData and haven't hydrated yet
    if (initialData && !didHydrate) {
      setDidHydrate(true);
      return;
    }

    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams(searchParams.toString());
        if (defaultCategory && !query.has('category')) {
          query.set('category', defaultCategory);
        }
        
        const res = await fetch(`/api/products?${query.toString()}`);
        if (!res.ok) throw new Error("Network error");
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Failed to fetch products", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, defaultCategory, didHydrate]);

  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
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
    if (data && (page < 1 || page > data.totalPages)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  }, [data, router, pathname, searchParams]);

  const resetFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const activeData = data ?? initialData;

  return {
    products: activeData?.products || [],
    totalProducts: activeData?.total || 0,
    totalPages: activeData?.totalPages || 1,
    currentPage,
    facets: activeData?.facets || { categories: {}, materials: {} },
    isLoading,
    updateFilters,
    goToPage,
    resetFilters,
    hasNextPage: activeData ? currentPage < activeData.totalPages : false,
    hasPrevPage: currentPage > 1,
    filters: activeFilters
  };
}
