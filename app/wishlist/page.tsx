import { cookies } from "next/headers";
import Link from "next/link";
import { BellRing, Bookmark, Heart, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { TelemetryView } from "@/components/telemetry-view";
import { getStoredEngagementSnapshot } from "@/lib/engagement-store";
import { readExperimentAssignments } from "@/lib/experiments";
import { buildMarketplaceHomeExperience } from "@/lib/marketplace-intelligence";
import { getMarketplaceProducts } from "@/lib/products";
import { getViewerIdentity } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const cookieStore = await cookies();
  const viewer = await getViewerIdentity(cookieStore);
  const engagement = await getStoredEngagementSnapshot(viewer.buyerId, cookieStore);
  const experiments = readExperimentAssignments(cookieStore);
  const { products, sourceState, errorMessage } = await getMarketplaceProducts({
    query: "",
    material: "",
    category: "",
    priceRange: "",
    rating: ""
  });
  const homeExperience = buildMarketplaceHomeExperience({
    products,
    engagement,
    experiments
  });
  const wishlistProducts = products.filter((product) => engagement.wishlistIds.includes(product.id));
  const savedProducts = products.filter((product) => engagement.savedForLaterIds.includes(product.id));

  return (
    <main className="shell py-8 pb-20">
      <TelemetryView
        page="/wishlist"
        properties={{
          wishlist: wishlistProducts.length,
          saved: savedProducts.length,
          alerts: homeExperience.alerts.length
        }}
      />

      <section className="panel overflow-hidden px-6 py-8 sm:px-12 bg-white/40">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <div className="tag">
              <Heart className="h-3.5 w-3.5 text-gold" />
              Buyer intent hub
            </div>
            <h1 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">Your Selections.</h1>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-royal/70">
              Account-linked signals now shape your recommendations across devices when you use the same account.
            </p>
          </div>

          <div className="grid w-full gap-4 sm:w-auto sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/20 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-royal/60">Wishlisted</p>
              <p className="mt-3 font-display text-3xl font-semibold text-royal">{wishlistProducts.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-royal/60">Saved later</p>
              <p className="mt-3 font-display text-3xl font-semibold text-royal">{savedProducts.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-royal/60">Alerts</p>
              <p className="mt-3 font-display text-3xl font-semibold text-royal">{homeExperience.alerts.length}</p>
            </div>
          </div>
        </div>
      </section>

      {sourceState !== "database" ? (
        <section className="panel mt-6 border-gold/25 bg-gold/10 p-5 text-sm text-slate-700">
          {errorMessage ?? "Live catalog signals are partially degraded right now."}
        </section>
      ) : null}

      <section className="mt-8 grid gap-8 xl:grid-cols-2">
        <div className="panel p-6 sm:p-10">
          <div className="flex items-center gap-2 text-royal">
            <Heart className="h-4 w-4 text-gold" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Wishlist</p>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {wishlistProducts.length > 0 ? (
              wishlistProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index === 0} />
              ))
            ) : (
              <div className="rounded-[24px] bg-white/60 border border-white/20 p-8 text-center text-sm font-medium text-royal/60 sm:col-span-2 shadow-sm backdrop-blur-xl">
                Your wishlist is empty. Try the category lanes or price-drop products to discover something worth saving.
              </div>
            )}
          </div>
        </div>

        <div className="panel p-6 sm:p-10">
          <div className="flex items-center gap-2 text-royal">
            <Bookmark className="h-4 w-4 text-gold" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Save for later</p>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {savedProducts.length > 0 ? (
              savedProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index === 0} />
              ))
            ) : (
              <div className="rounded-[24px] bg-white/60 border border-white/20 p-8 text-center text-sm font-medium text-royal/60 sm:col-span-2 shadow-sm backdrop-blur-xl">
                No saved-for-later items yet. This becomes useful when buyers compare margins, delivery timing, or budget bins.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="panel p-6 sm:p-10">
          <div className="flex items-center gap-2 text-royal">
            <BellRing className="h-4 w-4 text-gold" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Active alerts</p>
          </div>
          <div className="mt-6 space-y-4">
            {homeExperience.alerts.length > 0 ? (
              homeExperience.alerts.map((alert) => (
                <Link
                  key={`${alert.type}-${alert.productId}`}
                  href={`/products/${alert.productId}`}
                  className="block rounded-[24px] bg-white/60 border border-white/20 p-5 text-sm font-medium text-royal/80 transition hover:scale-[1.02] shadow-sm backdrop-blur-xl"
                >
                  {alert.label}
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] bg-white/60 border border-white/20 p-8 text-center text-sm font-medium text-royal/60 shadow-sm backdrop-blur-xl">
                Turn on back-in-stock or price-drop alerts from any product page to see them collected here.
              </div>
            )}
          </div>
        </div>

        <div className="panel p-6 sm:p-10">
          <div className="flex items-center gap-2 text-royal">
            <Sparkles className="h-4 w-4 text-gold" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">
              Suggested continuation
            </p>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {homeExperience.similarProducts.length > 0 ? (
              homeExperience.similarProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index === 0} />
              ))
            ) : (
              <div className="rounded-[24px] bg-white/60 border border-white/20 p-8 text-center text-sm font-medium text-royal/60 sm:col-span-2 shadow-sm backdrop-blur-xl">
                Browse a few products first and this area will begin surfacing related pieces.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
