import Link from "next/link";
import { LayoutGrid, Sparkles } from "lucide-react";
import { ProductsList } from "@/components/ProductsList";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import { getMarketplaceProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const { products } = await getMarketplaceProducts({
    query: "",
    material: "",
    category: "",
    priceRange: "",
    rating: ""
  });

  return (
    <main className="shell py-8 pb-20">
      <section className="panel overflow-hidden px-6 py-8 sm:px-12 bg-white/40">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <div className="tag">
              <LayoutGrid className="h-3.5 w-3.5 text-gold" />
              Category-first discovery
            </div>
            <h1 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">Browse By Lane.</h1>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-royal/70">
              Jump into sweaters, amigurumi, and blankets through highly visual category lanes and low-friction chips.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {CATEGORY_OPTIONS.map((category) => (
              <Link
                key={category}
                href={`/?category=${encodeURIComponent(category)}`}
                className="rounded-full border border-royal/10 bg-white/80 shadow-sm backdrop-blur px-5 py-2.5 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-royal transition hover:scale-[1.03]"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <ProductsList initialProducts={products} />
      </section>
    </main>
  );
}
