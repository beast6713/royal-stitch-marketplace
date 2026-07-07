import { cookies } from "next/headers";
import Link from "next/link";
import { Heart, Settings2, Sparkles, UserCircle2 } from "lucide-react";
import { AccountPreferences } from "@/components/account-preferences";
import { ProductCard } from "@/components/product-card";
import { TelemetryView } from "@/components/telemetry-view";
import { getCartSnapshot } from "@/lib/cart";
import { getStoredEngagementSnapshot } from "@/lib/engagement-store";
import { readExperimentAssignments } from "@/lib/experiments";
import { buildMarketplaceHomeExperience } from "@/lib/marketplace-intelligence";
import { getBuyerOrders } from "@/lib/orders";
import { getMarketplaceProducts } from "@/lib/products";
import { getViewerIdentity } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const viewer = await getViewerIdentity(cookieStore);
  const engagement = await getStoredEngagementSnapshot(viewer.buyerId, cookieStore);
  const experiments = readExperimentAssignments(cookieStore);
  const { products } = await getMarketplaceProducts({
    query: "",
    material: "",
    category: "",
    priceRange: "",
    rating: ""
  });
  const orders = await getBuyerOrders(viewer.buyerId);
  const cart = await getCartSnapshot({
    buyerId: viewer.buyerId,
    cookieStore
  });
  const homeExperience = buildMarketplaceHomeExperience({
    products,
    engagement,
    experiments
  });
  const continueBrowsing = Array.from(
    new Map(
      homeExperience.sections
        .flatMap((section) => section.products)
        .map((product) => [product.id, product])
    ).values()
  ).slice(0, 4);

  return (
    <main className="shell py-8 pb-20">
      <TelemetryView
        page="/account"
        properties={{
          signedIn: viewer.isAuthenticated,
          orders: orders.length
        }}
      />

      <section className="panel overflow-hidden px-6 py-8 sm:px-12 bg-white/40">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <div className="tag">
              <UserCircle2 className="h-3.5 w-3.5 text-gold" />
              Account and preferences
            </div>
            <h1 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">{viewer.buyerName}&apos;s Atelier Profile.</h1>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-royal/70">
              Manage your preferences, low-data browsing, saved intent, and the recommendations your activity is shaping.
            </p>
          </div>

          <div className="grid w-full gap-4 sm:w-auto sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/20 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-royal/60">Orders</p>
              <p className="mt-3 font-display text-3xl font-semibold text-royal">{orders.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-royal/60">Wishlist</p>
              <p className="mt-3 font-display text-3xl font-semibold text-royal">
                {engagement.wishlistIds.length}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-royal/60">Cart items</p>
              <p className="mt-3 font-display text-3xl font-semibold text-royal">{cart.items.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="panel p-6 sm:p-10">
          <div className="flex items-center gap-2 text-royal">
            <Settings2 className="h-4 w-4 text-gold" />
            <p className="text-[10px] uppercase font-bold tracking-[0.2em]">Preferences</p>
          </div>
          <div className="mt-6">
            <AccountPreferences />
          </div>
        </div>

        <div className="panel p-6 sm:p-10">
          <div className="flex items-center gap-2 text-royal">
            <Heart className="h-4 w-4 text-gold" />
            <p className="text-[10px] uppercase font-bold tracking-[0.2em]">Continue browsing</p>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {continueBrowsing.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index === 0} />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/wishlist" className="button-secondary">
              Wishlist
            </Link>
            <Link href="/cart" className="button-secondary">
              Cart
            </Link>
            <Link href="/orders" className="button-secondary">
              Orders
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
