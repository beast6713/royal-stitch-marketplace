"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, CreditCard, LoaderCircle, RotateCcw, WalletCards } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { notifyCartChanged, pushMarketplaceToast, triggerMarketplaceHaptics } from "@/lib/client-toast";
import { formatCurrency } from "@/lib/utils";

import type { CartSnapshot } from "@/lib/types";

// Make typescript aware of Razorpay window object
declare global {
  interface Window {
    Razorpay: any;
  }
}

export function CartCheckoutPanel({
  total,
  codEligible = true,
  cart
}: {
  total: number;
  codEligible?: boolean;
  cart?: CartSnapshot;
}) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi" | "card">(
    codEligible ? "cod" : "upi"
  );
  const [shippingAddress, setShippingAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const [isPending, startTransition] = useTransition();
  const activeItems = useMemo(() => cart?.items.filter((item) => !item.savedForLater) ?? [], [cart]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  function handleCheckout() {
    setErrorMessage(null);

    if (shippingAddress.trim().length < 10) {
      pushMarketplaceToast({
        title: "Missing Address",
        description: "Please provide a complete delivery address."
      });
      return;
    }

    startTransition(async () => {
      try {
        if (paymentMethod !== "cod") {
          const res = await loadRazorpay();
          if (!res) {
            throw new Error("Razorpay SDK failed to load. Are you online?");
          }

          const orderResponse = await fetch("/api/payments/razorpay/order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": idempotencyKey
            },
            body: JSON.stringify({
              paymentMethod,
              shippingAddress,
              idempotencyKey
            })
          });
          const orderData = await orderResponse.json();

          if (!orderResponse.ok) {
            throw new Error(orderData.error ?? "Failed to initialize payment gateway.");
          }

          const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Royal Stitch Marketplace",
            description: "Secure Payment",
            order_id: orderData.razorpayOrderId,
            handler: async function (response: any) {
              await verifyRazorpayPayment({
                localOrderId: orderData.localOrderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
            },
            modal: {
              ondismiss: function () {
                setErrorMessage("Payment was not completed. You can retry before the pending order expires.");
              }
            },
            prefill: {
              name: "Buyer",
              email: "buyer@example.com",
            },
            theme: {
              color: "#30313d",
            },
          };

          const paymentObject = new window.Razorpay(options);
          paymentObject.on("payment.failed", function (response: any) {
            const reason = response?.error?.description ?? "Payment failed before completion.";
            setErrorMessage(reason);
            pushMarketplaceToast({
              title: "Payment failed",
              description: reason
            });
          });
          paymentObject.open();
        } else {
          // COD directly places order
          await completeOrderPlacement();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Please try again.";
        setErrorMessage(message);
        pushMarketplaceToast({
          title: "Checkout failed",
          description: message
        });
      }
    });
  }

  async function completeOrderPlacement(paymentDetails?: any) {
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          paymentMethod,
          shippingAddress,
          idempotencyKey,
          ...paymentDetails
        })
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to complete checkout.");
      }

      notifyCartChanged();
      triggerMarketplaceHaptics();
      pushMarketplaceToast({
        title: "Order placed",
        description: `Your ${formatCurrency(total)} order is now confirmed.`
      });
      setIdempotencyKey(
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
      router.push("/orders");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      setErrorMessage(message);
      pushMarketplaceToast({
        title: "Order Placement failed",
        description: message
      });
    }
  }

  async function verifyRazorpayPayment(paymentDetails: {
    localOrderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const response = await fetch("/api/payments/razorpay/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(paymentDetails)
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      status?: string;
    };

    if (!response.ok && response.status !== 202) {
      throw new Error(data.error ?? "Payment could not be verified.");
    }

    notifyCartChanged();
    triggerMarketplaceHaptics();

    if (response.status === 202) {
      pushMarketplaceToast({
        title: "Payment received",
        description: "Order confirmation is being reconciled. Check orders in a moment."
      });
    } else {
      pushMarketplaceToast({
        title: "Payment confirmed",
        description: `Your ${formatCurrency(total)} order is now paid.`
      });
    }

    setIdempotencyKey(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    router.push("/orders");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Shipping Details */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/50">Shipping details</h2>
        <div className="mt-4">
          <textarea
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            disabled={isPending}
            placeholder="Enter your full delivery address including city, state, and pincode..."
            className="h-28 w-full resize-none rounded-[18px] border border-royal/10 bg-white p-4 text-sm text-royal outline-none transition focus:border-royal/30 focus:ring-2 focus:ring-royal/10 disabled:cursor-not-allowed disabled:bg-royal/5"
          />
        </div>
      </section>

      {/* Payment Methods */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/50">Payment method</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { key: "cod", label: "Cash on delivery", enabled: codEligible, icon: WalletCards },
          { key: "upi", label: "UPI / wallet", enabled: true, icon: CreditCard },
          { key: "card", label: "Card payment", enabled: true, icon: CreditCard }
        ].map((option) => {
          const Icon = option.icon;
          const active = paymentMethod === option.key;

          return (
            <button
              key={option.key}
              type="button"
              disabled={!option.enabled || isPending}
              onClick={() => setPaymentMethod(option.key as "cod" | "upi" | "card")}
              className={`rounded-[24px] border px-4 py-4 text-left transition ${
                active
                  ? "border-royal bg-royal text-white"
                  : "border-royal/10 bg-white text-royal"
              } ${!option.enabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <Icon className="h-4 w-4" />
              <p className="mt-3 text-sm font-semibold">{option.label}</p>
            </button>
          );
        })}
        </div>
      </section>

        {errorMessage ? (
          <div className="flex items-start gap-3 rounded-[18px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Checkout needs attention</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleCheckout}
          disabled={isPending || activeItems.length === 0}
          className="button-primary w-full justify-center mt-6"
        >
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : errorMessage ? (
            <RotateCcw className="h-4 w-4" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {isPending ? "Placing order..." : errorMessage ? "Retry checkout" : "Place order"}
        </button>
    </div>
  );
}
