import type { Metadata } from 'next';
import { mockProducts } from '@/lib/mock-data';
import { ClientProductsList as ProductsList } from '@/components/ClientProductsList';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  // Re-map slug to Title Case
  const title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  return {
    title: `${title} | Royal Stitch Market`,
    description: `Discover beautiful handmade ${title} products at Royal Stitch Market. Curated artisan pieces directly from creators.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  // Validate category exists
  const validSlugsMap = new Map();
  mockProducts.forEach(p => {
    validSlugsMap.set(p.category.toLowerCase().replace(/\s+/g, '-'), p.category);
  });
  
  if (!validSlugsMap.has(slug)) {
    notFound();
  }

  const originalCategoryName = validSlugsMap.get(slug);

  // Under enterprise conditions, this layout acts as a shell sending down initial Server Components
  // Client component `<ProductsList>` will inherently fetch via the `/api/products` using our new useProducts hook.
  return (
    <main className="shell py-8 pb-20">
      <section className="panel overflow-hidden px-6 py-8 sm:px-12 bg-white/40 mb-12">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <div className="tag">
              Category Focus
            </div>
            <h1 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">
              Shop {title}.
            </h1>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-royal/70">
              Explore our complete collection of handmade {title.toLowerCase()} pieces. Each item is crafted with exceptional care and quality.
            </p>
          </div>
        </div>
      </section>

      <Suspense fallback={
        <div className="panel flex items-center justify-center py-12 bg-white/40">
          <span className="text-sm font-semibold tracking-wide text-royal/60 font-body">Loading pieces...</span>
        </div>
      }>
        <ProductsList defaultCategory={originalCategoryName} />
      </Suspense>
    </main>
  );
}
