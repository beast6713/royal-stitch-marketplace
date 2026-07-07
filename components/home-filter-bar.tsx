import Link from "next/link";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { CATEGORY_OPTIONS, MATERIAL_OPTIONS } from "@/lib/constants";
import type { ProductFilters } from "@/lib/types";

const priceOptions = [
  { value: "", label: "Any price" },
  { value: "under-1500", label: "Under Rs. 1,500" },
  { value: "1500-3000", label: "Rs. 1,500 - Rs. 3,000" },
  { value: "3000-plus", label: "Rs. 3,000+" }
] as const;

const ratingOptions = [
  { value: "", label: "Any rating" },
  { value: "4-plus", label: "4.0+ stars" },
  { value: "4.5-plus", label: "4.5+ stars" }
] as const;

export function HomeFilterBar({
  filters,
  resultCount
}: {
  filters: ProductFilters;
  resultCount: number;
}) {
  return (
    <form method="GET" className="panel p-4 sm:p-5">
      {filters.query ? <input type="hidden" name="query" value={filters.query} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f7efe5] px-3 py-1.5 font-semibold text-royal">
            <SlidersHorizontal className="h-4 w-4" />
            Refine your browse
          </span>
          {filters.query ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-white px-3 py-1.5">
              <Search className="h-4 w-4 text-royal/55" />
              Searching for &ldquo;{filters.query}&rdquo;
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-white px-3 py-1.5">
              <Sparkles className="h-4 w-4 text-[#9b5f18]" />
              Easy shopping experience
            </span>
          )}
        </div>

        <div className="rounded-full bg-royal/5 px-4 py-2 text-sm font-semibold text-royal">
          {resultCount} handmade finds
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr,1fr,1fr,1fr,auto,auto]">
        <select name="price" defaultValue={filters.priceRange} className="field mt-0">
          {priceOptions.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select name="category" defaultValue={filters.category} className="field mt-0">
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select name="material" defaultValue={filters.material} className="field mt-0">
          <option value="">All materials</option>
          {MATERIAL_OPTIONS.map((material) => (
            <option key={material} value={material}>
              {material}
            </option>
          ))}
        </select>

        <select name="rating" defaultValue={filters.rating} className="field mt-0">
          {ratingOptions.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button type="submit" className="button-primary w-full lg:w-auto">
          Apply
        </button>

        <Link href="/" className="button-secondary w-full lg:w-auto">
          Clear
        </Link>
      </div>
    </form>
  );
}
