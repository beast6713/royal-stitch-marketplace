"use client";

import { CheckCircle2, PackageSearch, ShieldCheck, Store, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createDemoSellerRecord,
  emptyOnboarding,
  normalizeDemoProducts,
  SELLER_STORAGE_KEY,
  type DemoSellerProduct,
  type DemoSellerRecord,
  type SellerOnboardingState
} from "@/lib/demo-seller";
import { formatCurrency } from "@/lib/utils";

type SellerStore = {
  onboarded?: boolean;
  form?: SellerOnboardingState;
  products?: DemoSellerProduct[];
  seller?: DemoSellerRecord | null;
};

function readSellerStore(): SellerStore {
  try {
    return JSON.parse(window.localStorage.getItem(SELLER_STORAGE_KEY) ?? "{}") as SellerStore;
  } catch {
    return {};
  }
}

function writeSellerStore(store: SellerStore) {
  window.localStorage.setItem(SELLER_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("royal-demo-marketplace-changed"));
}

function getSellerFromStore(store: SellerStore) {
  if (store.seller) {
    return store.seller;
  }

  if (store.form) {
    return createDemoSellerRecord({ ...emptyOnboarding, ...store.form });
  }

  return null;
}

export function AdminPanel() {
  const [hydrated, setHydrated] = useState(false);
  const [store, setStore] = useState<SellerStore>({});

  function refreshStore() {
    setStore(readSellerStore());
    setHydrated(true);
  }

  useEffect(() => {
    refreshStore();
    window.addEventListener("royal-demo-marketplace-changed", refreshStore);
    return () => window.removeEventListener("royal-demo-marketplace-changed", refreshStore);
  }, []);

  const seller = getSellerFromStore(store);
  const products = normalizeDemoProducts(store.products ?? []);
  const pendingApprovals = useMemo(() => {
    const sellerPending = seller?.status === "Pending" ? 1 : 0;
    const productPending = products.filter((product) => product.status === "Pending").length;
    return sellerPending + productPending;
  }, [products, seller?.status]);

  function updateSeller(status: DemoSellerRecord["status"]) {
    if (!seller) {
      return;
    }

    const nextSeller: DemoSellerRecord = {
      ...seller,
      status,
      rejectionMessage:
        status === "Rejected"
          ? "Demo feedback: identity or shop details need review before approval."
          : undefined
    };
    writeSellerStore({
      ...store,
      seller: nextSeller
    });
    refreshStore();
  }

  function updateProduct(productId: string, status: DemoSellerProduct["status"]) {
    writeSellerStore({
      ...store,
      products: products.map((product) =>
        product.id === productId
          ? {
              ...product,
              status,
              rejectionMessage:
                status === "Rejected"
                  ? "Demo feedback: improve product photos, price, or description."
                  : undefined
            }
          : product
      )
    });
    refreshStore();
  }

  if (!hydrated) {
    return (
      <main className="shell py-8 pb-20">
        <div className="panel p-8">
          <div className="h-10 w-48 animate-pulse rounded-full bg-royal/10" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-[24px] bg-royal/10" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="shell py-8 pb-20">
      <section className="panel bg-white/45 p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="tag">
              <ShieldCheck className="h-3.5 w-3.5" />
              Frontend admin
            </div>
            <h1 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">
              Marketplace control room.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-royal/70">
              Approve sellers and moderate products using localStorage only. No login or backend is connected.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <a href="#sellers-table" className="block transition duration-300 hover:-translate-y-1">
            <AdminMetric label="Total sellers" value={seller ? "1" : "0"} icon={Store} />
          </a>
          <AdminMetric label="Total products" value={String(products.length)} icon={PackageSearch} />
          <AdminMetric label="Pending approvals" value={String(pendingApprovals)} icon={ShieldCheck} />
        </div>
      </section>

      <section id="sellers-table" className="panel mt-8 p-6 sm:p-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/50">
              Sellers management
            </p>
            <h2 className="mt-2 font-display text-4xl text-royal">Seller approvals</h2>
          </div>
        </div>

        {seller ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-3 text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.18em] text-royal/45">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-royal/5">
                  <td className="rounded-l-[22px] px-3 py-4 font-semibold text-royal">
                    <a href={`/shop/${seller.id}`} target="_blank" rel="noreferrer" className="hover:text-gold hover:underline transition-colors shrink-0">
                      {seller.name}
                    </a>
                    <p className="mt-1 text-xs font-normal text-royal/55">{seller.shopName}</p>
                  </td>
                  <td className="px-3 py-4 text-royal/70">{seller.email}</td>
                  <td className="px-3 py-4">
                    <StatusPill status={seller.status} />
                  </td>
                  <td className="rounded-r-[22px] px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <AdminAction label="Approve seller" icon={CheckCircle2} onClick={() => updateSeller("Verified")} />
                      <AdminAction label="Reject seller" icon={XCircle} tone="danger" onClick={() => updateSeller("Rejected")} />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyAdminState message="No seller applications yet. Complete the Sell onboarding flow first." />
        )}
      </section>

      <section className="panel mt-8 p-6 sm:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/50">
          Products management
        </p>
        <h2 className="mt-2 font-display text-4xl text-royal">Product moderation</h2>

        {products.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-y-3 text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.18em] text-royal/45">
                <tr>
                  <th className="px-3 py-2">Product name</th>
                  <th className="px-3 py-2">Seller name</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="bg-royal/5">
                    <td className="rounded-l-[22px] px-3 py-4 font-semibold text-royal">
                      {product.name}
                      <p className="mt-1 text-xs font-normal text-royal/55">{product.category}</p>
                    </td>
                    <td className="px-3 py-4 text-royal/70">{product.sellerName}</td>
                    <td className="px-3 py-4 text-royal/70">{formatCurrency(product.price)}</td>
                    <td className="px-3 py-4">
                      <StatusPill status={product.status} />
                    </td>
                    <td className="rounded-r-[22px] px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <AdminAction label="Approve product" icon={CheckCircle2} onClick={() => updateProduct(product.id, "Approved")} />
                        <AdminAction label="Reject product" icon={XCircle} tone="danger" onClick={() => updateProduct(product.id, "Rejected")} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyAdminState message="No submitted products yet." />
        )}
      </section>
    </main>
  );
}

function AdminMetric({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: typeof Store;
}) {
  return (
    <div className="rounded-[24px] border border-white/20 bg-white/80 p-5 shadow-sm">
      <Icon className="h-5 w-5 text-gold" />
      <p className="mt-4 font-display text-4xl text-royal">{value}</p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-royal/50">
        {label}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Verified" || status === "Approved"
      ? "bg-pine/10 text-pine"
      : status === "Rejected"
        ? "bg-rose-50 text-rose-700"
        : "bg-gold/10 text-royal";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function AdminAction({
  label,
  icon: Icon,
  onClick,
  tone = "default"
}: {
  label: string;
  icon: typeof CheckCircle2;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
        tone === "danger"
          ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
          : "bg-royal text-white hover:bg-royal-soft"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function EmptyAdminState({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-[24px] bg-royal/5 p-8 text-center text-sm text-royal/65">
      {message}
    </div>
  );
}
