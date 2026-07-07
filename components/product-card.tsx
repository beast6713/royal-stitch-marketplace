import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Flame, Star, Truck, Zap } from "lucide-react";
import { ProductMediaCarousel } from "./ProductMediaCarousel";
import { ProductWishlistButton } from "@/components/product-wishlist-button";
import { getProductDiscountPercent } from "@/lib/product-core";
import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function getInventoryLabel(product: Product) {
  if (product.stockQuantity === 0 || product.status === "out_of_stock") {
    return "Made to order";
  }

  return `Only ${Math.max(product.stockQuantity ?? 1, 1)} left`;
}

function getDeliveryLabel(product: Product) {
  if (product.estimatedDispatchDays && product.estimatedDispatchDays <= 2) {
    return "Fast delivery";
  }

  return "Dispatches with care";
}

export function ProductCard({
  product,
  priority = false,
  isSellerView = false
}: {
  product: Product;
  priority?: boolean;
  isSellerView?: boolean;
}) {
  const discountPercent = getProductDiscountPercent(product.price, product.compareAtPrice);
  const deliveryLabel = getDeliveryLabel(product);
  const boughtToday = product.unitsSoldToday ?? 20;
  const isTrending = boughtToday >= 10;
  const rating = (product.averageRating ?? 4.8).toFixed(1);
  const isNewSeller = true; // MVP Mock boolean for first 5 products

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/20 bg-white/80 backdrop-blur-xl shadow-royal transition duration-500 hover:scale-105 hover:shadow-[0_45px_100px_rgba(16,37,66,0.22)]">
      {!isSellerView && (
         <ProductWishlistButton
           productId={product.id}
           productName={product.name}
           className="absolute right-4 top-4 z-10"
         />
      )}
      
      <Link href={isSellerView ? `/seller` : `/products/${product.id}`} className="block">
        <ProductMediaCarousel product={product} priority={priority} />
        
        <div className="absolute left-4 top-4 flex max-w-[70%] flex-wrap gap-2 z-20 pointer-events-none">
          <span className="inline-flex items-center gap-1 rounded-full backdrop-blur-md bg-white/80 border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-royal shadow-sm">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified Handmade
          </span>
          {isTrending ? (
            <span className="inline-flex items-center gap-1 rounded-full backdrop-blur-md bg-gold/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-sm">
              <Flame className="h-3.5 w-3.5" />
              Trending
            </span>
          ) : null}
        </div>

        {isNewSeller && !isSellerView && (
          <div className="absolute right-4 top-16 z-20 pointer-events-none rounded-full backdrop-blur-md bg-pine/90 border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-sm">
            <Zap className="h-3.5 w-3.5 inline mr-1" />
            New Seller Boost
          </div>
        )}

        {discountPercent ? (
          <div className="absolute left-4 top-16 z-20 pointer-events-none rounded-full backdrop-blur-md bg-royal/90 border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-champagne shadow-sm">
            Save {discountPercent}%
          </div>
        ) : null}

        <div className="absolute inset-x-4 bottom-4 z-20 pointer-events-none flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/80 backdrop-blur-xl px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-royal shadow-royal">
          <span className="inline-flex items-center gap-1 text-gold">
            <Flame className="h-3.5 w-3.5" />
            {boughtToday} bought today
          </span>
          <span className={product.stockQuantity === 0 ? "text-pine font-bold uppercase tracking-[0.15em]" : "text-royal/60 font-bold uppercase tracking-[0.15em]"}>{getInventoryLabel(product)}</span>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/60">
                {product.category}
              </p>
              <span className="rounded-full bg-royal/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-royal">
                {product.material}
              </span>
            </div>
            <h3 className="font-display text-3xl leading-tight text-royal">{product.name}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1 font-semibold text-royal">
              <Star className="h-4 w-4 fill-current text-gold" />
              {rating}
            </span>
            <span>{product.reviewCount ?? 24} reviews</span>
            <span className="inline-flex items-center gap-1">
              <Truck className="h-4 w-4 text-royal/60" />
              {deliveryLabel}
            </span>
          </div>

          <div className="grid gap-2 text-sm text-slate-600">
            <div className="flex items-end justify-between gap-4">
              <div>
                {product.compareAtPrice ? (
                  <p className="text-sm text-slate-400 line-through">
                    {formatCurrency(product.compareAtPrice)}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-3xl font-semibold text-royal">{formatCurrency(product.price)}</p>
                  {discountPercent ? (
                    <span className="rounded-full bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
                      {discountPercent}% off
                    </span>
                  ) : null}
                </div>
              </div>

              {product.codAvailable ? (
                <span className="rounded-full bg-pine/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-pine">
                  COD
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>

      <div className="px-5 pb-5 relative z-20">
        <div className="border-t border-[#efe5da] pt-4 text-sm text-slate-600">
          <div className="flex items-center justify-between gap-3">
            <Link 
              href={`/shop/${product.sellerId}`} 
              className="font-medium text-royal hover:text-gold transition-colors hover:underline"
            >
              By {product.sellerName}
            </Link>
            <p className="text-[#9b5f18]">Handmade with care</p>
          </div>
        </div>
      </div>
    </article>
  );
}
