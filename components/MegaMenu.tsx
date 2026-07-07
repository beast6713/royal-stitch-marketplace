"use client";

import { useState } from 'react';
import Link from 'next/link';
import { CATEGORY_OPTIONS, MATERIAL_OPTIONS } from '@/lib/constants';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MegaMenu({ className = '' }: { className?: string }) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  return (
    <div className={cn("absolute left-0 top-full w-screen max-w-4xl -translate-x-4 bg-white/95 backdrop-blur-xl shadow-2xl border rounded-2xl p-6 pointer-events-auto z-50", className)}>
      <div className="grid grid-cols-3 gap-8">
        {/* Categories */}
        <div>
          <h3 className="font-semibold text-royal mb-4 flex items-center gap-2 cursor-pointer group" onClick={() => toggleCategory('categories')}>
            Categories
            <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
          </h3>
          <div className={`space-y-2 ${openCategory === 'categories' ? 'block' : 'hidden'}`}>
            {CATEGORY_OPTIONS.map((category) => (
              <Link key={category} href={`/?category=${category}`} className="block text-sm hover:text-royal transition-colors">
                {category}
              </Link>
            ))}
          </div>
        </div>

        {/* Materials */}
        <div>
          <h3 className="font-semibold text-royal mb-4 flex items-center gap-2 cursor-pointer group" onClick={() => toggleCategory('materials')}>
            Materials
            <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
          </h3>
          <div className={`space-y-2 ${openCategory === 'materials' ? 'block' : 'hidden'}`}>
            {MATERIAL_OPTIONS.map((material) => (
              <Link key={material} href={`/?material=${material}`} className="block text-sm hover:text-royal transition-colors">
                {material}
              </Link>
            ))}
          </div>
        </div>

        {/* Featured */}
        <div>
          <h3 className="font-semibold text-royal mb-4">Trending now</h3>
          <div className="space-y-2">
            <Link href="/?price=under-1500" className="block text-sm hover:text-royal transition-colors">
              Under ₹1,500
            </Link>
            <Link href="/?rating=4.5-plus" className="block text-sm hover:text-royal transition-colors">
              4.5+ stars
            </Link>
            <Link href="/" className="block text-sm hover:text-royal transition-colors">
              New arrivals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

