import { cookies } from "next/headers";
import Link from "next/link";
import { LifeBuoy, PackageCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { TelemetryView } from "@/components/telemetry-view";
import { getBuyerReturns, getBuyerSupportCases, getBuyerOrders } from "@/lib/orders";
import { formatCurrency, formatDateTime, formatShortDate } from "@/lib/utils";
import { getViewerIdentity } from "@/lib/viewer";

export const dynamic = "force-dynamic";

function orderTone(status: string) {
  if (status === "cancelled" || status === "refunded" || status === "payment_failed") {
    return "bg-rose-50 text-rose-700";
  }

  if (status === "delivered") {
    return "bg-pine/10 text-pine";
  }

  return "bg-gold/10 text-royal";
}

export default async function OrdersPage() {
  const cookieStore = await cookies();
  const viewer = await getViewerIdentity(cookieStore);
  const orders = await getBuyerOrders(viewer.buyerId);
  const returns = await getBuyerReturns(viewer.buyerId);
  const supportCases = await getBuyerSupportCases(viewer.buyerId);
  const activeOrders = orders.filter((order) => order.status !== "delivered").length;

  return (
    <main className="shell py-8 pb-20">
      <TelemetryView
        page="/orders"
        properties={{
          orders: orders.length,
          returns: returns.length,
          cases: supportCases.length
        }}
      />

      <section className="panel overflow-hidden px-6 py-8 sm:px-12 bg-white/40">
        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div>
            <div className="tag">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" />
              Buyer care and trust
            </div>
            <h1 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">Order History.</h1>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-royal/70">
              The post-order flow now follows a real lifecycle with seller updates, payment method visibility, and self-serve support context.
            </p>
          </div>

          <div className="grid w-full gap-4 sm:w-auto sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/20 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-royal/60">Active orders</p>
              <p className="mt-3 font-display text-3xl font-semibold text-royal">{activeOrders}</p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-royal/60">Returns</p>
              <p className="mt-3 font-display text-3xl font-semibold text-royal">{returns.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-royal/60">Support cases</p>
              <p className="mt-3 font-display text-3xl font-semibold text-royal">{supportCases.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="panel p-6 sm:p-10">
          <div className="flex items-center gap-2 text-royal">
            <Truck className="h-4 w-4 text-gold" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Order timeline</p>
          </div>
          <div className="mt-6 space-y-4">
            {orders.length > 0 ? (
              orders.map((order) => (
                <div key={order.id} className="rounded-[24px] bg-royal/5 border border-royal/10 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/50">{order.id}</p>
                      <h2 className="mt-2 font-display text-3xl text-royal">{order.items.length > 1 ? `${order.items.length} Items` : "1 Item"}</h2>
                    </div>
                    <div className={`rounded-full px-4 py-2 text-sm font-semibold ${orderTone(order.status)}`}>
                      {order.status.replaceAll("_", " ")}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-4 text-sm text-slate-600">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-royal/55">Tracking</p>
                      <p className="mt-1 font-medium text-royal">
                        {order.items[0]?.courierName || "Processing"} &bull; {order.items[0]?.trackingNumber || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-royal/55">Estimated delivery</p>
                      <p className="mt-1 font-medium text-royal">{order.items[0]?.estimatedDeliveryAt ? formatDateTime(order.items[0].estimatedDeliveryAt) : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-royal/55">Payment</p>
                      <p className="mt-1 font-medium capitalize text-royal">
                        {order.paymentMethod ?? "cod"} &bull; {order.paymentStatus ?? "pending"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-royal/55">Total</p>
                      <p className="mt-1 font-medium text-royal">{formatCurrency(order.total)}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] bg-white/80 p-4 text-sm text-slate-600">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3">
                        <span>
                          {item.productName}
                          {item.selectedColor ? ` \u2022 ${item.selectedColor}` : ""}
                          {item.selectedSize ? ` \u2022 ${item.selectedSize}` : ""}
                        </span>
                        <span>
                          {item.quantity} x {formatCurrency(item.unitPrice + (item.customMargin ?? 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] bg-royal/5 p-6 text-sm text-slate-600">
                No live orders yet. Your next checkout will appear here with tracking and payment status.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6 sm:p-10">
            <div className="flex items-center gap-2 text-royal">
              <RotateCcw className="h-4 w-4 text-gold" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Returns and refunds</p>
            </div>
            <div className="mt-5 space-y-3">
              {returns.length > 0 ? (
                returns.map((entry) => (
                  <div key={entry.id} className="rounded-[24px] bg-royal/5 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-royal">
                      {entry.status.replaceAll("_", " ")} &bull; {entry.refundStatus.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2">{entry.reason}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-royal/55">
                      Updated {formatShortDate(entry.updatedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] bg-royal/5 p-6 text-sm text-slate-600">
                  No active return flows right now.
                </div>
              )}
            </div>
          </div>

          <div className="panel p-6 sm:p-10">
            <div className="flex items-center gap-2 text-royal">
              <LifeBuoy className="h-4 w-4 text-gold" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Support cases</p>
            </div>
            <div className="mt-5 space-y-3">
              {supportCases.length > 0 ? (
                supportCases.map((caseItem) => (
                  <div key={caseItem.id} className="rounded-[24px] bg-royal/5 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-royal">{caseItem.title}</p>
                    <p className="mt-2">{caseItem.description}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-royal/55">
                      {caseItem.caseType} &bull; {caseItem.status} &bull; {formatShortDate(caseItem.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] bg-royal/5 p-6 text-sm text-slate-600">
                  No support cases are open. The 1-tap support experience will surface here when needed.
                </div>
              )}
            </div>
          </div>

          <div className="panel p-6 sm:p-10">
            <div className="flex items-center gap-2 text-royal">
              <PackageCheck className="h-4 w-4 text-gold" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Buyer protection</p>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="rounded-[24px] bg-royal/5 p-4">COD status and charges stay visible before checkout.</div>
              <div className="rounded-[24px] bg-royal/5 p-4">Support and refund progress stays tied to the order timeline.</div>
              <div className="rounded-[24px] bg-royal/5 p-4">Use alerts and saved products to reorder or continue browsing after delivery.</div>
            </div>
            <Link href="/wishlist" className="button-secondary mt-6">
              Review watched products
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
