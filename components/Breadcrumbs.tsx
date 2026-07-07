"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../lib/utils';

export function Breadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const paths = pathname.split('/').filter(Boolean);
  const hasFilters = searchParams.toString();

  const crumbs = [
    { label: 'Home', href: '/', icon: Home },
    ...(paths.map((path, index) => {
      if (path === '[productId]') {
        return null; // Dynamic, handled separately
      }
      const href = `/${paths.slice(0, index + 1).join('/')}${hasFilters ? `?${searchParams.toString()}` : ''}`;
      return { label: path.charAt(0).toUpperCase() + path.slice(1), href };
    }).filter(Boolean) as Array<{ label: string; href: string }>),
  ];

  if (paths.includes('[productId]')) {
    crumbs.push({ label: 'Product', href: pathname });
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-500" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <div key={index} className="flex items-center space-x-1">
          {index > 0 && <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />}
          <Link
            href={crumb.href}
            className="hover:text-royal transition-colors font-medium"
          >
            {crumb.label}
          </Link>
        </div>
      ))}
      {hasFilters && (
        <span className="ml-1 text-xs text-slate-400">(filtered)</span>
      )}
    </nav>
  );
}

