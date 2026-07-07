"use client";

import Image from "next/image";
import { Bookmark, BookmarkCheck, Minus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifyCartChanged, pushMarketplaceToast } from "@/lib/client-toast";
import type { CartItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function CartLineItems({ items }: { items: CartItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateQuantity(item: CartItem, quantity: number) {
    setBusyId(item.id);

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: item.productId,
          quantity: Math.max(quantity, 0),
          selectedColor: item.selectedColor ?? null,
          selectedSize: item.selectedSize ?? null,
          customMargin: item.customMargin ?? 0,
          savedForLater: item.savedForLater ?? false
        })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Unable to update cart.");
      }

      notifyCartChanged();
      router.refresh();
    } catch (error) {
      pushMarketplaceToast({
        title: "Cart update failed",
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {items.map((item) => {
        const isBusy = busyId === item.id;
        const lineTotal = (item.product.price + (item.customMargin ?? 0)) * item.quantity;

        return (
          <div
            key={`${item.id}-${item.selectedColor}-${item.selectedSize}`}
            className="rounded-[24px] border border-royal/10 bg-royal/5 p-5"
          >
            <div className="grid gap-5 md:grid-cols-[96px,1fr,auto] md:items-center">
              <div className="relative h-24 w-24 overflow-hidden rounded-[18px] bg-white">
                <Image
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/50">
                  {item.product.category}
                </p>
                <h2 className="mt-2 font-display text-3xl text-royal">{item.product.name}</h2>
                <p className="mt-2 text-sm font-medium text-royal/70">
                  {item.selectedColor ?? "Classic"} / {item.selectedSize ?? "Standard"}
                </p>
                {item.customMargin ? (
                  <p className="mt-2 text-sm font-semibold text-pine">
                    Reseller earning: {formatCurrency(item.customMargin * item.quantity)}
                  </p>
                ) : null}
              </div>

                <div className="flex flex-col gap-4 md:items-end">
                  <div className="text-left md:text-right">
                    {item.product.compareAtPrice ? (
                      <p className="text-sm text-royal/40 line-through">
                        {formatCurrency(item.product.compareAtPrice)}
                      </p>
                    ) : null}
                    <p className="font-display text-3xl font-semibold text-royal">
                      {formatCurrency(lineTotal)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void updateQuantity(item, item.quantity - 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-royal/10 bg-white text-royal disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="flex h-10 min-w-12 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-royal">
                      {isBusy ? "..." : item.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void updateQuantity(item, item.quantity + 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-royal/10 bg-white text-royal disabled:opacity-50"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void updateQuantity(item, 0)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 disabled:opacity-50"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={async () => {
                        setBusyId(item.id);
                        try {
                          await fetch("/api/cart", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              productId: item.productId,
                              quantity: item.quantity,
                              selectedColor: item.selectedColor ?? null,
                              selectedSize: item.selectedSize ?? null,
                              customMargin: item.customMargin ?? 0,
                              savedForLater: !item.savedForLater
                            })
                          });
                          notifyCartChanged();
                          router.refresh();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-royal/60 hover:text-royal transition"
                    >
                      {item.savedForLater ? (
                        <>
                          <BookmarkCheck className="h-3.5 w-3.5 text-pine" />
                          Move to cart
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-3.5 w-3.5" />
                          Save for later
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        );
      })}
    </div>
  );
}
