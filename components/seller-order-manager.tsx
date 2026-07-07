"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { pushMarketplaceToast } from "@/lib/client-toast";
import type { MarketplaceOrder, OrderStatus, ShippingStatus } from "@/lib/types";

const NEXT_STATUS: Partial<Record<OrderStatus, { label: OrderStatus; shippingStatus: ShippingStatus }>> = {
  paid: { label: "shipped", shippingStatus: "in_transit" },
  shipped: { label: "delivered", shippingStatus: "delivered" }
};

export function SellerOrderManager({ order }: { order: MarketplaceOrder }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextStatus = NEXT_STATUS[order.status];
  const [currentStatus, setCurrentStatus] = useState(order.status);

  if (!nextStatus) {
    return (
      <div className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-royal">
        {currentStatus.replaceAll("_", " ")}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            const response = await fetch(`/api/orders/${order.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                status: nextStatus.shippingStatus
              })
            });
            const data = (await response.json().catch(() => ({}))) as { error?: string };

            if (!response.ok) {
              throw new Error(data.error ?? "Unable to update order status.");
            }

            setCurrentStatus(nextStatus.label);
            pushMarketplaceToast({
              title: "Order updated",
              description: `Order ${order.id} moved to ${nextStatus.label.replaceAll("_", " ")}.`
            });
            router.refresh();
          } catch (error) {
            pushMarketplaceToast({
              title: "Status update failed",
              description: error instanceof Error ? error.message : "Please try again."
            });
          }
        })
      }
      className="rounded-full bg-royal px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white"
    >
      {isPending ? <LoaderCircle className="inline h-4 w-4 animate-spin" /> : `Mark ${nextStatus.label.replaceAll("_", " ")}`}
    </button>
  );
}
