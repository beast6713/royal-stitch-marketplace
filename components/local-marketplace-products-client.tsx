"use client";


import Image from "next/image";
import { Eye, ShoppingBag, Store } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DEMO_ORDERS_STORAGE_KEY,
  normalizeDemoProducts,
  SELLER_STORAGE_KEY,
  type DemoOrder,
  type DemoSellerProduct,
  type DemoSellerRecord,
  type SellerOnboardingState
} from "@/lib/demo-seller";
import { pushMarketplaceToast } from "@/lib/client-toast";
import { formatCurrency } from "@/lib/utils";

type SellerStore = {
  form?: SellerOnboardingState;
  products?: DemoSellerProduct[];
  seller?: DemoSellerRecord | null;
};

function readStore(): SellerStore {
  try {
    return JSON.parse(window.localStorage.getItem(SELLER_STORAGE_KEY) ?? "{}") as SellerStore;
  } catch {
    return {};
  }
}

function writeStore(store: SellerStore) {
  window.localStorage.setItem(SELLER_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("royal-demo-marketplace-changed"));
}

function readOrders(): DemoOrder[] {
  try {
    return JSON.parse(window.localStorage.getItem(DEMO_ORDERS_STORAGE_KEY) ?? "[]") as DemoOrder[];
  } catch {
    return [];
  }
}

function writeOrders(orders: DemoOrder[]) {
  window.localStorage.setItem(DEMO_ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

export function LocalMarketplaceProducts() {
  const [store, setStore] = useState<SellerStore>({});
  const [selectedProduct, setSelectedProduct] = useState<DemoSellerProduct | null>(null);

  function refreshStore() {
    setStore(readStore());
  }

  useEffect(() => {
    refreshStore();
    window.addEventListener("royal-demo-marketplace-changed", refreshStore);
    return () => window.removeEventListener("royal-demo-marketplace-changed", refreshStore);
  }, []);

  const sellerVerified = store.seller?.status === "Verified";
  const approvedProducts = sellerVerified
    ? normalizeDemoProducts(store.products ?? []).filter((product) => product.status === "Approved")
    : [];

  function updateProduct(productId: string, updater: (product: DemoSellerProduct) => DemoSellerProduct) {
    const currentStore = readStore();
    const nextStore = {
      ...currentStore,
      products: normalizeDemoProducts(currentStore.products ?? []).map((product) =>
        product.id === productId ? updater(product) : product
      )
    };
    writeStore(nextStore);
    setStore(nextStore);
  }

  function trackView(product: DemoSellerProduct) {
    updateProduct(product.id, (current) => ({
      ...current,
      views: current.views + 1
    }));
    setSelectedProduct({
      ...product,
      views: product.views + 1
    });
  }

  function trackAddToCart(product: DemoSellerProduct) {
    updateProduct(product.id, (current) => ({
      ...current,
      addToCartCount: current.addToCartCount + 1
    }));
    pushMarketplaceToast({
      title: "Demo cart updated",
      description: `${product.name} was counted as an add-to-cart action.`
    });
  }

  function placeDemoOrder(product: DemoSellerProduct) {
    const order: DemoOrder = {
      id: `demo-order-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      sellerId: product.sellerId,
      total: product.price,
      createdAt: new Date().toISOString()
    };
    writeOrders([order, ...readOrders()]);
    updateProduct(product.id, (current) => ({
      ...current,
      sales: current.sales + 1,
      stock: Math.max(current.stock - 1, 0)
    }));
    pushMarketplaceToast({
      title: "Demo order placed",
      description: `${product.name} now appears in the seller dashboard.`
    });
  }

  if (approvedProducts.length === 0) {
    return null;
  }

  return (
    <section className="shell pt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="tag">
            <Store className="h-3.5 w-3.5" />
            Verified local sellers
          </div>
          <h2 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">
            Newly Approved Seller Picks
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-royal/70">
            These products appear only after admin approval in the frontend marketplace simulation.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {approvedProducts.map((product) => (
          <article key={product.id} className="panel overflow-hidden">
            <div className="relative aspect-[4/3] bg-royal/5">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 1280px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pine">
                  Verified seller
                </p>
                <p className="rounded-full bg-royal/5 px-3 py-1 text-xs font-semibold text-royal">
                  {product.stock} stock
                </p>
              </div>
              <h3 className="mt-3 font-display text-3xl text-royal">{product.name}</h3>
              <p className="mt-2 text-sm text-royal/60">{product.sellerName}</p>
              <p className="mt-4 font-display text-3xl text-royal">{formatCurrency(product.price)}</p>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => trackView(product)} className="button-secondary justify-center">
                  <Eye className="h-4 w-4" />
                  View
                </button>
                <button type="button" onClick={() => trackAddToCart(product)} className="button-secondary justify-center">
                  <ShoppingBag className="h-4 w-4" />
                  Cart
                </button>
                <button type="button" onClick={() => placeDemoOrder(product)} className="button-primary justify-center">
                  Buy
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {selectedProduct ? (
        <div className="mt-6 rounded-[24px] border border-pine/15 bg-pine/10 p-5 text-sm text-royal">
          Viewed {selectedProduct.name}. This local view is now counted in seller analytics.
        </div>
      ) : null}
    </section>
  );
}
