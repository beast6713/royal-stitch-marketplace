"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SellerDashboard } from "@/components/seller-dashboard";
import { SellerOnboarding } from "@/components/seller-onboarding";
import {
  createDemoSellerRecord,
  createFirstDemoProduct,
  normalizeDemoProducts,
  type DemoSellerRecord,
  emptyOnboarding,
  SELLER_STORAGE_KEY,
  type DemoSellerProduct,
  type SellerOnboardingState,
  starterProducts
} from "@/lib/demo-seller";

export function SellerPortal() {
  const [hydrated, setHydrated] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<SellerOnboardingState>(emptyOnboarding);
  const [products, setProducts] = useState<DemoSellerProduct[]>([]);
  const [seller, setSeller] = useState<DemoSellerRecord | null>(null);

  useEffect(() => {
    function loadStoredSellerState() {
      const stored = window.localStorage.getItem(SELLER_STORAGE_KEY);

      if (stored) {
        try {
          const parsed = JSON.parse(stored) as {
            onboarded?: boolean;
            form?: SellerOnboardingState;
            products?: DemoSellerProduct[];
            seller?: DemoSellerRecord;
          };
          setOnboarded(Boolean(parsed.onboarded));
          setForm({ ...emptyOnboarding, ...parsed.form });
          setProducts(parsed.products?.length ? normalizeDemoProducts(parsed.products) : []);
          setSeller(
            parsed.seller ??
              (parsed.onboarded && parsed.form ? createDemoSellerRecord({ ...emptyOnboarding, ...parsed.form }) : null)
          );
        } catch {
          setProducts([]);
        }
      }
    }

    loadStoredSellerState();
    window.addEventListener("royal-demo-marketplace-changed", loadStoredSellerState);
    window.addEventListener("storage", loadStoredSellerState);
    const timer = window.setTimeout(() => setHydrated(true), 350);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("royal-demo-marketplace-changed", loadStoredSellerState);
      window.removeEventListener("storage", loadStoredSellerState);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(
      SELLER_STORAGE_KEY,
      JSON.stringify({
        onboarded,
        form,
        products,
        seller
      })
    );
  }, [form, hydrated, onboarded, products, seller]);

  function completeOnboarding() {
    setSeller(createDemoSellerRecord(form));
    setProducts([createFirstDemoProduct(form)]);
    setOnboarded(true);
    setSuccess(true);
  }

  if (!hydrated) {
    return <SellerSkeleton />;
  }

  if (success) {
    return (
      <main className="shell py-10 pb-20">
        <section className="panel mx-auto max-w-3xl p-8 text-center sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pine/10 text-pine">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-royal/60">
            Seller application submitted
          </p>
          <h1 className="mt-4 font-display text-5xl tracking-tight text-royal">
            {form.shopName || "Your shop"} is under review.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-royal/70">
            Your seller profile and first product were submitted for frontend-only admin approval.
            No bank, ID, or product data was sent to a server.
          </p>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="button-primary mt-8"
          >
            Open seller dashboard
          </button>
        </section>
      </main>
    );
  }

  if (!onboarded) {
    return <SellerOnboarding form={form} setForm={setForm} onComplete={completeOnboarding} />;
  }

  return (
    <SellerDashboard
      form={form}
      seller={seller}
      products={products}
      onAddProduct={() => setProducts((current) => [...current, starterProducts[0]])}
      onUpdateProduct={(id, updates) => setProducts((current) => current.map(p => p.id === id ? { ...p, ...updates } : p))}
      onDeleteProduct={(id) => setProducts((current) => current.filter(p => p.id !== id))}
      onEditOnboarding={() => setOnboarded(false)}
    />
  );
}

function SellerSkeleton() {
  return (
    <main className="shell py-8 pb-20">
      <div className="panel p-8">
        <div className="h-8 w-40 animate-pulse rounded-full bg-royal/10" />
        <div className="mt-8 h-16 w-2/3 animate-pulse rounded-[24px] bg-royal/10" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-[24px] bg-royal/10" />
          ))}
        </div>
      </div>
    </main>
  );
}
