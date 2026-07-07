"use client";

import { CreditCard, Home, LoaderCircle, MapPin, ShieldAlert, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { notifyCartChanged, pushMarketplaceToast } from "@/lib/client-toast";
import { DEMO_ORDERS_STORAGE_KEY, type DemoOrder } from "@/lib/demo-seller";
import type { CartSnapshot } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type DemoPaymentMethod = "upi" | "card" | "cod";

export function DemoCheckoutExperience({ cart }: { cart: CartSnapshot }) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<DemoPaymentMethod>("cod");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  async function clearCartAfterDemoSuccess() {
    for (const item of cart.items) {
      await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: item.productId,
          quantity: 0,
          selectedColor: item.selectedColor ?? null,
          selectedSize: item.selectedSize ?? null,
          customMargin: item.customMargin ?? 0,
          savedForLater: item.savedForLater ?? false
        })
      }).catch(() => undefined);
    }
  }

  function storeDemoOrders() {
    let existingOrders: DemoOrder[] = [];

    try {
      existingOrders = JSON.parse(window.localStorage.getItem(DEMO_ORDERS_STORAGE_KEY) ?? "[]") as DemoOrder[];
    } catch {
      existingOrders = [];
    }
    const nextOrders = cart.items.map((item) => ({
      id: `checkout-demo-order-${Date.now()}-${item.productId}`,
      productId: item.productId,
      productName: item.product.name,
      sellerId: item.product.sellerId,
      total: (item.product.price + (item.customMargin ?? 0)) * item.quantity,
      createdAt: new Date().toISOString()
    }));
    window.localStorage.setItem(DEMO_ORDERS_STORAGE_KEY, JSON.stringify([...nextOrders, ...existingOrders]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPlacingOrder(true);

    await new Promise((resolve) => window.setTimeout(resolve, 1300));

    if (simulateFailure) {
      router.push(`/order-failed?method=${paymentMethod}&total=${cart.total}`);
      return;
    }

    storeDemoOrders();
    await clearCartAfterDemoSuccess();
    notifyCartChanged();
    pushMarketplaceToast({
      title: "Demo order placed",
      description: "No real payment was processed."
    });
    router.push(`/order-success?method=${paymentMethod}&total=${cart.total}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 xl:grid-cols-[1.1fr,0.9fr]">
      <section className="space-y-6">
        <div className="panel p-6 sm:p-10">
          <div className="flex items-center gap-2 text-royal">
            <MapPin className="h-4 w-4 text-gold" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Delivery address</p>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <CheckoutField id="fullName" label="Full name" placeholder="Aarohi Singh" required />
            <CheckoutField id="phone" label="Phone" placeholder="+91 98765 43210" required />
            <CheckoutField id="pincode" label="Pincode" placeholder="110001" required />
            <CheckoutField id="city" label="City" placeholder="New Delhi" required />
            <div className="md:col-span-2">
              <label htmlFor="address" className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-royal/55">
                  Address
                </span>
                <textarea
                  id="address"
                  rows={4}
                  required
                  placeholder="House number, street, landmark, city, state"
                  className="mt-2 w-full resize-none rounded-[18px] border border-royal/10 bg-white px-4 py-3 text-sm text-royal outline-none transition focus:border-royal/30 focus:ring-2 focus:ring-royal/10"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="panel p-6 sm:p-10">
          <div className="flex items-center gap-2 text-royal">
            <CreditCard className="h-4 w-4 text-gold" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Payment method</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { key: "upi", label: "UPI", icon: WalletCards },
              { key: "card", label: "Card", icon: CreditCard },
              { key: "cod", label: "Cash on Delivery", icon: Home }
            ].map((option) => {
              const Icon = option.icon;
              const active = paymentMethod === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setPaymentMethod(option.key as DemoPaymentMethod)}
                  className={`rounded-[22px] border p-4 text-left transition ${
                    active ? "border-royal bg-royal text-white" : "border-royal/10 bg-white text-royal"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <p className="mt-3 text-sm font-semibold">{option.label}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-[22px] border border-gold/20 bg-gold/5 p-5">
            <div className="flex items-center gap-2 text-gold">
              <ShieldAlert className="h-4 w-4" />
              <p className="text-sm font-semibold text-royal">Demo payment system</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-royal/70">
              The Place Order button simulates processing and redirects to a result page. No card,
              UPI, or COD provider is contacted.
            </p>
            {paymentMethod === "upi" ? (
              <CheckoutField id="upi-id" label="Demo UPI ID" placeholder="name@bank" />
            ) : paymentMethod === "card" ? (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <CheckoutField id="card-number" label="Demo card number" placeholder="4242 4242 4242 4242" />
                <CheckoutField id="expiry" label="Expiry" placeholder="12/30" />
                <CheckoutField id="cvv" label="CVV" placeholder="123" />
              </div>
            ) : (
              <p className="mt-4 rounded-[18px] bg-white/70 p-4 text-sm text-royal/70">
                Cash on Delivery selected. Payment status will be shown as due on delivery in this demo.
              </p>
            )}
          </div>

          <label className="mt-5 flex items-center gap-3 rounded-[18px] bg-royal/5 px-4 py-3 text-sm font-semibold text-royal">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(event) => setSimulateFailure(event.target.checked)}
            />
            Simulate failed order for testing
          </label>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="panel p-6 sm:p-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/50">
            Order summary
          </p>
          <div className="mt-6 space-y-4">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 rounded-[18px] bg-royal/5 p-4">
                <div>
                  <p className="font-semibold text-royal">{item.product.name}</p>
                  <p className="mt-1 text-sm text-royal/60">
                    Qty {item.quantity} / {item.selectedColor ?? "Classic"} / {item.selectedSize ?? "Standard"}
                  </p>
                </div>
                <p className="font-semibold text-royal">
                  {formatCurrency((item.product.price + (item.customMargin ?? 0)) * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-4 text-sm text-royal/70">
            <SummaryRow label="Subtotal" value={formatCurrency(cart.subtotal)} />
            <SummaryRow label="Discounts" value={`-${formatCurrency(cart.discountTotal)}`} />
            <SummaryRow label="Shipping" value={cart.shippingFee === 0 ? "Free" : formatCurrency(cart.shippingFee)} />
            <div className="flex items-center justify-between border-t border-royal/10 pt-4 font-display text-2xl text-royal">
              <span>Total</span>
              <span>{formatCurrency(cart.total)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPlacingOrder}
            className="button-primary mt-8 w-full justify-center disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPlacingOrder ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {isPlacingOrder ? "Placing order..." : "Place Order"}
          </button>
        </div>
      </aside>
    </form>
  );
}

function CheckoutField({
  id,
  label,
  placeholder,
  required = false
}: {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-royal/55">
        {label}
      </span>
      <input
        id={id}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[18px] border border-royal/10 bg-white px-4 py-3 text-sm text-royal outline-none transition focus:border-royal/30 focus:ring-2 focus:ring-royal/10"
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
