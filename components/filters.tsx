import Link from "next/link";
import { AlertTriangle, Database, Filter, Search, SlidersHorizontal } from "lucide-react";
import { CATEGORY_OPTIONS, MATERIAL_OPTIONS } from "@/lib/constants";
import type { MarketplaceDataState, ProductFilters } from "@/lib/types";

export function Filters({
  filters,
  resultCount,
  sourceState,
  message
}: {
  filters: ProductFilters;
  resultCount: number;
  sourceState: MarketplaceDataState;
  message?: string;
}) {
  return (
    <form method="GET" className="panel sticky top-24 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="tag">
            <Filter className="h-3.5 w-3.5" />
            Shop the collection
          </div>
          <h2 className="mt-4 text-3xl text-royal">Find your next favorite</h2>
        </div>
        <div className="rounded-full bg-royal/10 p-3 text-royal">
          <SlidersHorizontal className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="query" className="text-sm font-medium text-slate-700">
          Search
        </label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="query"
            name="query"
            defaultValue={filters.query}
            placeholder="Cardigan, toy, cozy throw..."
            className="field pl-11"
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="material" className="text-sm font-medium text-slate-700">
          Material
        </label>
        <select id="material" name="material" defaultValue={filters.material} className="field">
          <option value="">All materials</option>
          {MATERIAL_OPTIONS.map((material) => (
            <option key={material} value={material}>
              {material}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label htmlFor="category" className="text-sm font-medium text-slate-700">
          Category
        </label>
        <select id="category" name="category" defaultValue={filters.category} className="field">
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 flex gap-3">
        <button type="submit" className="button-primary flex-1">
          Apply filters
        </button>
        <Link href="/" className="button-secondary">
          Clear
        </Link>
      </div>

      <div className="mt-6 rounded-[24px] border border-royal/10 bg-royal/5 p-4 text-sm text-slate-700">
        <p className="font-semibold text-royal">{resultCount} products visible</p>
        <p className="mt-2">
          Search by style, material, or category to uncover handmade pieces that feel personal.
        </p>
      </div>

      {sourceState === "demo" ? (
        <div className="mt-4 rounded-[24px] border border-gold/20 bg-gold/10 p-4 text-sm text-slate-700">
          <div className="flex items-center gap-2 font-semibold text-royal">
            <Database className="h-4 w-4" />
            Curated preview
          </div>
          <p className="mt-2">
            {message ?? "A handpicked preview is showing while the full artisan collection refreshes."}
          </p>
        </div>
      ) : null}

      {sourceState === "unconfigured" ? (
        <div className="mt-4 rounded-[24px] border border-gold/20 bg-gold/10 p-4 text-sm text-slate-700">
          <div className="flex items-center gap-2 font-semibold text-royal">
            <Database className="h-4 w-4" />
            Collection update in progress
          </div>
          <p className="mt-2">
            {message ?? "We are preparing more products for you. Please check back in a moment."}
          </p>
        </div>
      ) : null}

      {sourceState === "error" ? (
        <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            A few products are taking longer to load
          </div>
          <p className="mt-2">
            {message ?? "Please try again shortly while we refresh the collection."}
          </p>
        </div>
      ) : null}
    </form>
  );
}
