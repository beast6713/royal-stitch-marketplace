"use client";

import Link from "next/link";
import { CreditCard, MapPin, MessageCircleMore, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { notifyCartChanged, pushMarketplaceToast, triggerMarketplaceHaptics } from "@/lib/client-toast";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";

function deriveColorOptions(product: Product) {
  if (product.category === "Sweaters") {
    return ["Ivory", "Rosewood", "Emerald"];
  }

  if (product.category === "Blankets") {
    return ["Sand", "Rosewood", "Sage"];
  }

  return ["Sky", "Cream", "Blush"];
}

function deriveSizeOptions(product: Product) {
  if (product.category === "Amigurumi") {
    return ["Mini", "Classic", "Gift Set"];
  }

  if (product.category === "Blankets") {
    return ["Throw", "Queen", "King"];
  }

  return ["S", "M", "L"];
}

function getDeliveryMessage(pincode: string, dispatchDays = 2) {
  const numeric = Number(pincode.slice(-2) || "0");
  const extraDays = Number.isFinite(numeric) ? numeric % 3 : 1;
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + dispatchDays + extraDays + 2);

  return deliveryDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

export function ProductPurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const colorOptions = useMemo(() => deriveColorOptions(product), [product]);
  const sizeOptions = useMemo(() => deriveSizeOptions(product), [product]);
  const [selectedColor, setSelectedColor] = useState(colorOptions[0] ?? "Classic");
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] ?? "Standard");
  const [pincode, setPincode] = useState("110001");
  const [customMargin, setCustomMargin] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const estimatedDelivery = getDeliveryMessage(pincode, product.estimatedDispatchDays ?? 2);
  const earning = customMargin;

  async function updateCart(andGoToCart = false) {
    setIsBusy(true);

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
          selectedColor,
          selectedSize,
          customMargin
        })
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update the cart.");
      }

      notifyCartChanged();
      triggerMarketplaceHaptics();
      pushMarketplaceToast({
        title: andGoToCart ? "Ready for checkout" : "Added to cart",
        description: `${product.name} is now in your cart.`
      });

      if (andGoToCart) {
        router.push("/cart?checkout=1");
      } else {
        router.refresh();
      }
    } catch (error) {
      pushMarketplaceToast({
        title: "Cart update failed",
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function shareProduct(channel: "whatsapp" | "instagram" | "link") {
    const previewPrice = product.price + customMargin;
    const shareText = `Royal Stitch Market find: ${product.name} for ${formatCurrency(previewPrice)}. Your earning margin: ${formatCurrency(earning)}. ${window.location.href}`;

    await fetch("/api/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: "share.created",
        page: `/products/${product.id}`,
        productId: product.id,
        sellerId: product.sellerId,
        properties: {
          channel,
          margin: customMargin
        }
      })
    }).catch(() => undefined);

    if (channel === "whatsapp") {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
    } else if (channel === "instagram") {
      await navigator.clipboard.writeText(shareText).catch(() => undefined);
      pushMarketplaceToast({
        title: "Share caption copied",
        description: "Paste it into your Instagram story or DM."
      });
    } else {
      await navigator.clipboard.writeText(shareText).catch(() => undefined);
      pushMarketplaceToast({
        title: "Share link copied",
        description: "Your reseller-style share note is ready."
      });
    }
  }

  return (
    <div className="panel p-6 sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <div className="tag">trust-first purchase</div>
        <div className="rounded-full bg-pine/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-pine">
          {product.codAvailable ? "COD available" : "Prepaid only"}
        </div>
        <div className="rounded-full bg-royal/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-royal">
          Only {Math.max(product.stockQuantity ?? 0, 1)} left
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal/55">Color</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedColor === color
                    ? "bg-royal text-white"
                    : "border border-royal/15 bg-white text-royal hover:bg-royal/5"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal/55">Size</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sizeOptions.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedSize === size
                    ? "bg-gold text-white"
                    : "border border-royal/15 bg-white text-royal hover:bg-royal/5"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr,0.8fr]">
          <div>
            <label htmlFor="pincode" className="text-xs font-semibold uppercase tracking-[0.18em] text-royal/55">
              Delivery pincode
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-royal/10 bg-white px-4 py-3">
              <MapPin className="h-4 w-4 text-royal/50" />
              <input
                id="pincode"
                value={pincode}
                onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full bg-transparent text-sm text-royal outline-none"
                placeholder="Enter pincode"
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">Delivery by {estimatedDelivery}</p>
          </div>

          <div>
            <label htmlFor="margin" className="text-xs font-semibold uppercase tracking-[0.18em] text-royal/55">
              Reseller margin
            </label>
            <div className="mt-2 rounded-2xl border border-royal/10 bg-white px-4 py-3">
              <input
                id="margin"
                type="number"
                min="0"
                max="10000"
                value={customMargin}
                onChange={(event) => setCustomMargin(Number(event.target.value || 0))}
                className="w-full bg-transparent text-sm text-royal outline-none"
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">Your earning: {formatCurrency(earning)}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void updateCart(false)}
            disabled={isBusy}
            className="button-secondary w-full"
          >
            <ShoppingBag className="h-4 w-4" />
            {isBusy ? "Adding..." : "Add to cart"}
          </button>
          <button
            type="button"
            onClick={() => void updateCart(true)}
            disabled={isBusy}
            className="button-primary w-full"
          >
            <CreditCard className="h-4 w-4" />
            {isBusy ? "Preparing..." : "Buy now"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => void shareProduct("whatsapp")}
            className="rounded-2xl border border-royal/15 bg-white px-4 py-3 text-sm font-semibold text-royal transition hover:bg-royal/5"
          >
            Share on WhatsApp
          </button>
          <button
            type="button"
            onClick={() => void shareProduct("instagram")}
            className="rounded-2xl border border-royal/15 bg-white px-4 py-3 text-sm font-semibold text-royal transition hover:bg-royal/5"
          >
            Share on Instagram
          </button>
          <button
            type="button"
            onClick={() => void shareProduct("link")}
            className="rounded-2xl border border-royal/15 bg-white px-4 py-3 text-sm font-semibold text-royal transition hover:bg-royal/5"
          >
            Copy reseller link
          </button>
        </div>

        <div className="rounded-[24px] bg-royal/5 p-4 text-sm text-slate-600">
          Share preview: {product.name} for {formatCurrency(product.price + customMargin)}. Margin on
          this order: {formatCurrency(earning)}.
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] bg-royal/5 p-4 text-sm text-slate-600">
            <Truck className="mb-2 h-4 w-4 text-royal" />
            Delivery ETA by pincode
          </div>
          <div className="rounded-[22px] bg-royal/5 p-4 text-sm text-slate-600">
            <ShieldCheck className="mb-2 h-4 w-4 text-royal" />
            Secure payment badges near checkout
          </div>
          <div className="rounded-[22px] bg-royal/5 p-4 text-sm text-slate-600">
            <MessageCircleMore className="mb-2 h-4 w-4 text-royal" />
            1-tap support after order
          </div>
        </div>

        <Link href="/cart" className="text-sm font-semibold text-royal underline-offset-4 hover:underline">
          Open cart and checkout
        </Link>
      </div>
    </div>
  );
}
