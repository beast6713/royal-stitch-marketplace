import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Heart, MessageCircle, Share2, ShoppingBag } from "lucide-react";
import { getMarketplaceProducts } from "@/lib/products";
import { formatCurrency } from "@/lib/utils";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function ReelsFeed() {
  const catalog = await getMarketplaceProducts({
    query: "",
    material: "",
    category: "",
    priceRange: "",
    rating: ""
  });
  const products = catalog.products;

  return (
    <div className="flex h-[calc(100vh-80px)] w-full max-w-md mx-auto flex-col overflow-y-scroll snap-y snap-mandatory hide-scrollbar rounded-[32px] border border-white/10 bg-black shadow-2xl relative">
      {products.map((product) => (
        <div key={product.id} className="relative h-full w-full flex-none snap-center bg-black">
          {/* Mock Video Placeholder using Image */}
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
          
          {/* Overlay Content */}
          <div className="absolute inset-x-0 bottom-0 p-6 flex items-end justify-between">
            <div className="flex-1 right-8 relative">
              <h3 className="font-display text-4xl text-white mb-2 tracking-tight drop-shadow-md">{product.name}</h3>
              <p className="text-sm font-sans text-white/90 line-clamp-2 max-w-[80%] mb-4 drop-shadow-md">
                {product.description || "Beautiful handmade item crafted with care."}
              </p>
              
              <Link href={`/products/${product.id}`} className="inline-flex items-center gap-2 rounded-full backdrop-blur-xl bg-white/80 border border-white/20 px-6 py-3 text-sm font-semibold text-royal shadow-royal transition hover:bg-white hover:scale-105">
                <ShoppingBag className="w-4 h-4" />
                Acquire Now - {formatCurrency(product.price)}
              </Link>
            </div>
            
            {/* Action Bar Right */}
            <div className="flex flex-col gap-6 items-center absolute right-6 bottom-16">
              <button className="flex flex-col items-center gap-1 text-white">
                <div className="w-12 h-12 rounded-full backdrop-blur-xl bg-white/20 border border-white/20 shadow-royal flex items-center justify-center hover:bg-white/30 transition hover:scale-105">
                  <Heart className="w-5 h-5 fill-current text-white" />
                </div>
                <span className="text-[10px] font-bold tracking-widest">{product.reviewCount ? product.reviewCount * 12 : 240}</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-white">
                <div className="w-12 h-12 rounded-full backdrop-blur-xl bg-white/20 border border-white/20 shadow-royal flex items-center justify-center hover:bg-white/30 transition hover:scale-105">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-bold tracking-widest">{product.reviewCount ?? 12}</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-white">
                <div className="w-12 h-12 rounded-full backdrop-blur-xl bg-white/20 border border-white/20 shadow-royal flex items-center justify-center hover:bg-white/30 transition hover:scale-105">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-bold tracking-widest">Share</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReelsPage() {
  return (
    <main className="shell py-8 min-h-screen bg-parchment">
      <div className="flex flex-col items-center gap-4 mb-8">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-royal/10 bg-white/60 backdrop-blur-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-royal shadow-sm transition hover:bg-white">
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>
        <h1 className="font-display text-5xl tracking-tight text-royal">Discovery</h1>
        <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-royal/60">
          Immersive Atelier Preview
        </span>
      </div>

      <Suspense fallback={<div className="h-[calc(100vh-80px)] w-full max-w-md mx-auto bg-slate-900 rounded-[32px] animate-pulse" />}>
        <ReelsFeed />
      </Suspense>
    </main>
  );
}
