import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, ShoppingBag, Sparkles, Truck } from "lucide-react";
import { CartLineItems } from "@/components/cart-line-items";
import { ProductCard } from "@/components/product-card";
import { TelemetryView } from "@/components/telemetry-view";
import { getCartSnapshot } from "@/lib/cart";
import { getStoredEngagementSnapshot } from "@/lib/engagement-store";
import { readExperimentAssignments } from "@/lib/experiments";
import { buildMarketplaceHomeExperience } from "@/lib/marketplace-intelligence";
import { getMarketplaceProducts } from "@/lib/products";
import { formatCurrency } from "@/lib/utils";
import { getViewerIdentity } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cookieStore = await cookies();
  const viewer = await getViewerIdentity(cookieStore);
  const cart = await getCartSnapshot({
    buyerId: viewer.buyerId,
    cookieStore
  });
  const engagement = await getStoredEngagementSnapshot(viewer.buyerId, cookieStore);
  const experiments = readExperimentAssignments(cookieStore);
  const { products } = await getMarketplaceProducts({
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

  return (
    <main className="shell py-8 pb-20">
      <TelemetryView
        page="/cart"
        properties={{
          items: cart.items.length,
          total: cart.total
        }}
      />

      {(() => {
        const activeItems = cart.items.filter((i) => !i.savedForLater);
        const savedItems = cart.items.filter((i) => i.savedForLater);

        return (
          <>

      <section className="panel overflow-hidden px-6 py-8 sm:px-12 bg-white/40">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <div className="tag">
              <ShoppingBag className="h-3.5 w-3.5" />
              Checkout-ready cart
            </div>
            <h1 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">Your Order Flow.</h1>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-royal/70">
              Review your handmade picks, choose the payment method that suits you best, and move through a seamless checkout with confidence.
            </p>
          </div>

          <div className="grid w-full gap-4 sm:w-auto sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/20 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-royal/60">Items</p>
              <p className="mt-3 font-display text-3xl font-semibold text-royal">{activeItems.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-royal/60">Total</p>
              <p className="mt-3 font-display text-3xl font-semibold text-royal">{formatCurrency(cart.total)}</p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-royal/60">ETA</p>
              <p className="mt-3 font-display text-xl font-semibold text-royal">{cart.estimatedDeliveryLabel}</p>
            </div>
          </div>
        </div>
      </section>

      {activeItems.length > 0 ? (
        <section className="mt-8 grid gap-8 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="panel p-6 sm:p-10">
            <div className="flex items-center gap-2 text-royal">
              <Truck className="h-4 w-4 text-gold" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Cart items</p>
            </div>
            <CartLineItems items={activeItems} />
          </div>

          <div className="space-y-6">
            <div className="panel p-6 sm:p-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/50">Order summary</p>
                  <h2 className="mt-3 font-display text-4xl text-royal">Checkout overview</h2>
                </div>
                <div className="rounded-full bg-gold/10 px-4 py-2 font-body text-xs font-semibold text-gold">
                  COD-first UX
                </div>
              </div>

              <div className="mt-8 space-y-4 font-body text-sm font-medium text-royal/70">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cart.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Discounts</span>
                  <span className="text-gold">-{formatCurrency(cart.discountTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <span>{cart.shippingFee === 0 ? "Free" : formatCurrency(cart.shippingFee)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-royal/10 pt-4 font-display text-2xl font-semibold text-royal">
                  <span>Total</span>
                  <span>{formatCurrency(cart.total)}</span>
                </div>
              </div>

              <Link href="/checkout" className="button-primary mt-8 w-full justify-center">
                Continue to checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="panel p-6 sm:p-10">
              <div className="tag">trust-first checkout</div>
              <div className="mt-6 space-y-3 font-body text-sm font-medium text-royal/70">
                <div className="rounded-[22px] bg-royal/5 border border-royal/10 p-5">COD availability and charges stay visible before purchase.</div>
                <div className="rounded-[22px] bg-royal/5 border border-royal/10 p-5">Orders split cleanly by seller so shipment tracking stays accurate.</div>
                <div className="rounded-[22px] bg-royal/5 border border-royal/10 p-5">Returns and refunds continue in the post-order hub after checkout.</div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-8 grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="panel p-10 text-center flex flex-col justify-center items-center backdrop-blur-xl bg-white/40">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-royal/5 text-royal">
              <ShoppingBag className="h-8 w-8 text-gold" />
            </div>
            <h2 className="mt-6 font-display text-5xl tracking-tight text-royal">Your cart is empty.</h2>
            <p className="mt-4 max-w-sm font-body text-base leading-relaxed text-royal/70">
              Try a category chip, a low-price discovery section, or the products below to start your order journey.
            </p>
            <div className="mt-8">
              <Link href="/" className="button-primary">
                Explore the Atelier
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="panel p-6 sm:p-10">
            <div className="flex items-center gap-2 text-royal">
              <Sparkles className="h-4 w-4 text-gold" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/60">Suggested picks</p>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {homeExperience.sections[0]?.products.slice(0, 4).map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index === 0} />
              ))}
            </div>
          </div>
        </section>
      )}

      {savedItems.length > 0 && (
        <section className="mt-8">
          <div className="panel p-6 sm:p-10">
            <div className="flex items-center gap-2 text-royal">
              <Sparkles className="h-4 w-4 text-gold" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Saved for later ({savedItems.length})</p>
            </div>
            <CartLineItems items={savedItems} />
          </div>
        </section>
      )}

      </>
        );
      })()}
    </main>
  );
}
