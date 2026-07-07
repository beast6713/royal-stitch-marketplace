"use client";

import Image from "next/image";
import {
  BarChart3,
  Boxes,
  Copy,
  Edit3,
  Eye,
  PackagePlus,
  ShoppingBag,
  Store,
  Trash2,
  WalletCards
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SellerField } from "@/components/seller-form-fields";
import {
  calculateSellerMetrics,
  DEMO_ORDERS_STORAGE_KEY,
  DEMO_SELLER_ID,
  starterProducts,
  type DashboardTab,
  type DemoOrder,
  type DemoSellerRecord,
  type DemoSellerProduct,
  type DemoProductStatus,
  type SellerMetrics,
  type SellerOnboardingState
} from "@/lib/demo-seller";
import { formatCurrency } from "@/lib/utils";

export function SellerDashboard({
  form,
  seller,
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  orders: externalOrders,
  setOrders: externalSetOrders,
  onUpdateOrderStatus,
  onEditOnboarding
}: {
  form: SellerOnboardingState;
  seller: DemoSellerRecord | null;
  products: DemoSellerProduct[];
  onAddProduct?: () => void;
  onUpdateProduct?: (id: string, updates: any) => void;
  onDeleteProduct?: (id: string) => void;
  orders?: any[];
  setOrders?: (orders: any[]) => void;
  onUpdateOrderStatus?: (orderItemId: string, status: string) => void;
  onEditOnboarding: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [performanceFilter, setPerformanceFilter] = useState("all");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] = useState<DemoSellerProduct | null>(null);
  const [bulkAction, setBulkAction] = useState("Update stock");
  const [localOrders, setLocalOrders] = useState<DemoOrder[]>([]);
  
  const orders = externalOrders ?? localOrders;
  const handleSetOrders = externalSetOrders ?? setLocalOrders;

  const metrics = useMemo(() => calculateSellerMetrics(products), [products]);
  const sellerStatus = seller?.status ?? "Pending";
  const sellerVerified = sellerStatus === "Verified";
  const currentProduct = products.find((product) => product.id === editingProductId) ?? null;
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatches = categoryFilter === "all" || product.category === categoryFilter;
      const stockMatches =
        stockFilter === "all" ||
        (stockFilter === "low" && product.stock > 0 && product.stock <= 3) ||
        (stockFilter === "out" && product.stock === 0) ||
        (stockFilter === "healthy" && product.stock > 3);
      const performanceMatches =
        performanceFilter === "all" || product.performance === performanceFilter;

      return categoryMatches && stockMatches && performanceMatches;
    });
  }, [categoryFilter, performanceFilter, products, stockFilter]);

  useEffect(() => {
    if (externalOrders) return;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(DEMO_ORDERS_STORAGE_KEY) ?? "[]") as DemoOrder[];
      handleSetOrders(parsed.filter((order) => order.sellerId === (seller?.id ?? DEMO_SELLER_ID)));
    } catch {
      handleSetOrders([]);
    }
  }, [seller?.id, products, externalOrders, handleSetOrders]);

  function deleteProduct(productId: string) {
    if (onDeleteProduct) {
      onDeleteProduct(productId);
    }
    setSelectedProductIds((current) => current.filter((id) => id !== productId));
  }

  function duplicateProduct(product: DemoSellerProduct) {
    if (onAddProduct) onAddProduct();
  }

  function addPendingProduct() {
    if (onAddProduct) onAddProduct();
  }

  function applyBulkAction() {
    if (selectedProductIds.length === 0) {
      return;
    }

    if (bulkAction === "Delete products") {
      if (onDeleteProduct) {
        selectedProductIds.forEach(id => onDeleteProduct(id));
      }
      setSelectedProductIds([]);
      return;
    }

    if (onUpdateProduct) {
      selectedProductIds.forEach(id => {
        const product = products.find(p => p.id === id);
        if (product) {
           if (bulkAction === "Update price") {
             onUpdateProduct(id, { price: Math.round(product.price * 1.05) });
           } else {
             onUpdateProduct(id, { stock_quantity: product.stock + 5 });
           }
        }
      });
    }
  }

  function updateEditedProduct(
    key: keyof Pick<DemoSellerProduct, "name" | "price" | "stock" | "status" | "description" | "imageUrl" | "category" | "material" | "yarnType" | "additionalImageUrls">,
    value: string
  ) {
    if (!editingProductId || !onUpdateProduct) {
      return;
    }

    if (key === "price" || key === "stock") {
      onUpdateProduct(editingProductId, { [key === "stock" ? "stock_quantity" : key]: Number(value || 0) });
      return;
    }

    const keyMap: Record<string, string> = {
      imageUrl: "image_url",
      yarnType: "yarn_type",
      additionalImageUrls: "additional_image_urls"
    };

    const dbKey = keyMap[key] || key;
    if (key === "additionalImageUrls") {
      const urls = value.split(",").map((s) => s.trim()).filter(Boolean);
      onUpdateProduct(editingProductId, { [dbKey]: urls });
    } else {
      onUpdateProduct(editingProductId, { [dbKey]: value });
    }
  }

  return (
    <main className="min-h-screen bg-royal py-8 pb-20 text-white">
      <div className="shell">
        <section className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-royal backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-champagne">
                <Store className="h-3.5 w-3.5" />
                Seller dashboard
              </div>
              <h1 className="mt-6 font-display text-5xl tracking-tight text-white">
                {form.shopName || "Royal Stitch Seller Studio"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                Frontend-only seller workspace for products, orders, analytics, and onboarding handoff.
              </p>
            </div>
            <button
              type="button"
              onClick={onEditOnboarding}
              className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Edit onboarding
            </button>
          </div>
        </section>

        <SellerTrustBanner seller={seller} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[240px,1fr]">
          <aside className="rounded-3xl border border-white/15 bg-white/5 p-3 shadow-royal backdrop-blur-xl">
            {[
              { key: "overview", label: "Overview", icon: Store },
              { key: "products", label: "Products", icon: Boxes },
              { key: "orders", label: "Orders", icon: ShoppingBag },
              { key: "analytics", label: "Analytics", icon: BarChart3 }
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key as DashboardTab)}
                  className={`mb-2 flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left text-sm font-semibold transition ${
                    active ? "bg-champagne text-royal" : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </aside>

          <section className="min-w-0">
            {activeTab === "overview" ? (
              <OverviewTab metrics={metrics} products={products} setActiveTab={setActiveTab} />
            ) : activeTab === "products" ? (
              <ProductsTab
                products={products}
                filteredProducts={filteredProducts}
                selectedProductIds={selectedProductIds}
                setSelectedProductIds={setSelectedProductIds}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                stockFilter={stockFilter}
                setStockFilter={setStockFilter}
                performanceFilter={performanceFilter}
                setPerformanceFilter={setPerformanceFilter}
                bulkAction={bulkAction}
                setBulkAction={setBulkAction}
                applyBulkAction={applyBulkAction}
                addSampleProducts={() => alert("Sample products cannot be added in live mode.")}
                addPendingProduct={addPendingProduct}
                deleteProduct={deleteProduct}
                duplicateProduct={duplicateProduct}
                setEditingProductId={setEditingProductId}
                setPreviewProduct={setPreviewProduct}
                sellerVerified={sellerVerified}
              />
            ) : activeTab === "orders" ? (
              <OrdersTab orders={orders} onUpdateOrderStatus={onUpdateOrderStatus} />
            ) : (
              <AnalyticsTab metrics={metrics} products={products} />
            )}
          </section>
        </div>

        {currentProduct ? (
          <EditProductPanel
            product={currentProduct}
            updateEditedProduct={updateEditedProduct}
            onClose={() => setEditingProductId(null)}
          />
        ) : null}

        {previewProduct ? (
          <ProductPreviewPanel product={previewProduct} onClose={() => setPreviewProduct(null)} />
        ) : null}
      </div>
    </main>
  );
}

function SellerTrustBanner({ seller }: { seller: DemoSellerRecord | null }) {
  const status = seller?.status ?? "Pending";

  if (status === "Verified") {
    return (
      <div className="mt-6 rounded-3xl border border-pine/20 bg-pine/10 p-5 text-sm text-white shadow-royal">
        <p className="font-semibold text-pine">Verified seller badge active</p>
        <p className="mt-2 text-white/70">
          Your shop is approved. Approved products can appear in the customer marketplace.
        </p>
      </div>
    );
  }

  if (status === "Rejected") {
    return (
      <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-royal">
        <p className="font-semibold">Seller application rejected</p>
        <p className="mt-2">
          {seller?.rejectionMessage ??
            "Demo feedback: please improve identity, shop, or policy details before resubmitting."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-3xl border border-gold/25 bg-gold/10 p-5 text-sm text-white shadow-royal">
      <p className="font-semibold text-champagne">Under Review</p>
      <p className="mt-2 text-white/70">
        Your seller profile is pending admin approval. You can preview your workspace, but full operations unlock after verification.
      </p>
    </div>
  );
}

function OverviewTab({
  metrics,
  products,
  setActiveTab
}: {
  metrics: SellerMetrics;
  products: DemoSellerProduct[];
  setActiveTab: (tab: DashboardTab) => void;
}) {
  const lowStock = products.filter((product) => product.stock <= 3);

  return (
    <div className="space-y-6">
      <MetricGrid metrics={metrics} />
      <div className="grid gap-6 xl:grid-cols-[1fr,0.8fr]">
        <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-royal backdrop-blur-xl">
          <div className="flex items-center gap-2 text-champagne">
            <PackagePlus className="h-4 w-4" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Next actions</p>
          </div>
          <div className="mt-5 grid gap-3">
            <button type="button" onClick={() => setActiveTab("products")} className="rounded-[22px] bg-white/10 p-5 text-left text-sm text-white/75 transition hover:bg-white/15">
              Review product stock and publish any draft listings.
            </button>
            <button type="button" onClick={() => setActiveTab("analytics")} className="rounded-[22px] bg-white/10 p-5 text-left text-sm text-white/75 transition hover:bg-white/15">
              Check the conversion funnel before your next handmade drop.
            </button>
          </div>
        </div>
        <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-royal backdrop-blur-xl">
          <div className="flex items-center gap-2 text-champagne">
            <Boxes className="h-4 w-4" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Low stock alerts</p>
          </div>
          <div className="mt-5 space-y-3">
            {lowStock.length > 0 ? (
              lowStock.map((product) => (
                <div key={product.id} className="rounded-[20px] bg-white/10 p-4 text-sm text-white/75">
                  {product.name}: {product.stock} left
                </div>
              ))
            ) : (
              <div className="rounded-[20px] bg-white/10 p-5 text-sm text-white/60">
                No low stock alerts right now.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: SellerMetrics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Total sales", value: formatCurrency(metrics.sales), icon: WalletCards },
        { label: "Orders", value: String(metrics.orders), icon: ShoppingBag },
        { label: "Views", value: String(metrics.views), icon: Eye },
        { label: "Conversion rate", value: `${metrics.conversion.toFixed(1)}%`, icon: BarChart3 }
      ].map((metric) => {
        const Icon = metric.icon;

        return (
          <div key={metric.label} className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-royal backdrop-blur-xl">
            <Icon className="h-5 w-5 text-champagne" />
            <p className="mt-4 font-display text-4xl text-white">{metric.value}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
              {metric.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ProductsTab({
  products,
  filteredProducts,
  selectedProductIds,
  setSelectedProductIds,
  categoryFilter,
  setCategoryFilter,
  stockFilter,
  setStockFilter,
  performanceFilter,
  setPerformanceFilter,
  bulkAction,
  setBulkAction,
  applyBulkAction,
  addSampleProducts,
  addPendingProduct,
  deleteProduct,
  duplicateProduct,
  setEditingProductId,
  setPreviewProduct,
  sellerVerified
}: {
  products: DemoSellerProduct[];
  filteredProducts: DemoSellerProduct[];
  selectedProductIds: string[];
  setSelectedProductIds: (ids: string[] | ((current: string[]) => string[])) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  stockFilter: string;
  setStockFilter: (value: string) => void;
  performanceFilter: string;
  setPerformanceFilter: (value: string) => void;
  bulkAction: string;
  setBulkAction: (value: string) => void;
  applyBulkAction: () => void;
  addSampleProducts: () => void;
  addPendingProduct: () => void;
  deleteProduct: (productId: string) => void;
  duplicateProduct: (product: DemoSellerProduct) => void;
  setEditingProductId: (productId: string) => void;
  setPreviewProduct: (product: DemoSellerProduct) => void;
  sellerVerified: boolean;
}) {
  function toggleProduct(productId: string) {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-white/15 bg-white/5 p-10 text-center shadow-royal backdrop-blur-xl">
        <Boxes className="mx-auto h-10 w-10 text-champagne" />
        <h2 className="mt-5 font-display text-4xl text-white">No products yet.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/60">
          Add sample products to preview the seller product table, actions, filters, and bulk operations.
        </p>
        <button
          type="button"
          onClick={sellerVerified ? addPendingProduct : addSampleProducts}
          disabled={!sellerVerified}
          className="mt-6 rounded-full bg-champagne px-6 py-3 text-sm font-semibold text-royal disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sellerVerified ? "Submit demo product" : "Waiting for seller verification"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-4 shadow-royal backdrop-blur-xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-champagne">
            Product listing
          </p>
          <h2 className="mt-2 font-display text-4xl text-white">Seller products</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={bulkAction} onChange={(event) => setBulkAction(event.target.value)} className="rounded-full border border-white/15 bg-royal px-4 py-2 text-sm text-white">
            <option>Update price</option>
            <option>Update stock</option>
            <option>Delete products</option>
          </select>
          <button
            type="button"
            onClick={applyBulkAction}
            disabled={!sellerVerified}
            className="rounded-full bg-champagne px-5 py-2 text-sm font-semibold text-royal disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply bulk action
          </button>
          <button
            type="button"
            onClick={addPendingProduct}
            disabled={!sellerVerified}
            className="rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit product
          </button>
        </div>
      </div>

      {!sellerVerified ? (
        <div className="mt-5 rounded-[22px] border border-gold/20 bg-gold/10 p-4 text-sm text-champagne">
          Seller verification is required before editing, duplicating, or submitting more products.
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={["all", ...Array.from(new Set(products.map((product) => product.category)))]} />
        <FilterSelect label="Stock level" value={stockFilter} onChange={setStockFilter} options={["all", "healthy", "low", "out"]} />
        <FilterSelect label="Performance" value={performanceFilter} onChange={setPerformanceFilter} options={["all", "high", "steady", "low"]} />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[960px] border-separate border-spacing-y-3 text-left text-sm">
          <thead className="text-[10px] uppercase tracking-[0.18em] text-white/45">
            <tr>
              <th className="px-3 py-2">Select</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Sales</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} className="rounded-[22px] bg-white/8 text-white/80">
                <td className="rounded-l-[22px] px-3 py-4">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                  />
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={product.imageUrl}
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-[12px] object-cover"
                    />
                    <div>
                      <p className="font-semibold text-white">{product.name}</p>
                      <p className="text-xs text-white/45">{product.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4">{formatCurrency(product.price)}</td>
                <td className="px-3 py-4">{product.stock}</td>
                <td className="px-3 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.status === "Approved" ? "bg-pine/15 text-pine" : product.status === "Pending" ? "bg-gold/10 text-champagne" : product.status === "Draft" ? "bg-white/10 text-white/65" : "bg-rose-50 text-rose-700"}`}>
                    {product.status}
                  </span>
                  {product.status === "Pending" ? (
                    <p className="mt-2 text-xs text-champagne">Product under review</p>
                  ) : null}
                  {product.status === "Rejected" ? (
                    <p className="mt-2 text-xs text-rose-200">
                      {product.rejectionMessage ?? "Product rejected. Update details and resubmit."}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-4">{product.sales}</td>
                <td className="rounded-r-[22px] px-3 py-4">
                  <div className="flex flex-wrap gap-2">
                    <ActionButton label="Edit" icon={Edit3} onClick={() => setEditingProductId(product.id)} disabled={!sellerVerified} />
                    <ActionButton label="Delete" icon={Trash2} onClick={() => deleteProduct(product.id)} disabled={!sellerVerified} />
                    <ActionButton label="Duplicate" icon={Copy} onClick={() => duplicateProduct(product)} disabled={!sellerVerified} />
                    <ActionButton label="View" icon={Eye} onClick={() => setPreviewProduct(product)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-[24px] bg-white/10 p-8 text-center text-sm text-white/60">
          No products match those filters.
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-full border border-white/15 bg-royal px-4 py-3 text-sm capitalize text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  disabled = false
}: {
  label: string;
  icon: typeof Edit3;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function OrdersTab({ orders, onUpdateOrderStatus }: { orders: any[], onUpdateOrderStatus?: (id: string, status: string) => void }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-10 text-center shadow-royal backdrop-blur-xl">
      <ShoppingBag className="mx-auto h-10 w-10 text-champagne" />
      {orders.length > 0 ? (
        <>
          <h2 className="mt-5 font-display text-4xl text-white">Demo orders</h2>
          <div className="mt-6 space-y-3 text-left">
            {orders.map((order) => (
              <div key={order.id} className="rounded-[20px] bg-white/10 p-4 text-sm text-white/70">
                <p className="font-semibold text-white">{order.productName}</p>
                <p className="mt-1">
                  {formatCurrency(order.total)} / {new Date(order.createdAt).toLocaleDateString("en-IN")}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex rounded-full bg-champagne/10 px-2 py-1 text-xs font-semibold text-champagne">
                    {order.shippingStatus || "Pending"}
                  </span>
                  {onUpdateOrderStatus && order.shippingStatus !== "delivered" && (
                    <button
                      onClick={() => onUpdateOrderStatus(order.id, order.shippingStatus === "shipped" ? "delivered" : "shipped")}
                      className="rounded bg-champagne px-3 py-1 text-xs font-bold text-royal transition hover:bg-gold"
                    >
                      {order.shippingStatus === "shipped" ? "Mark Delivered" : "Mark Shipped"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-5 font-display text-4xl text-white">No seller orders yet.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/60">
            Approved product demo orders will appear here after customers buy from the local marketplace section.
          </p>
          <div className="mx-auto mt-6 grid max-w-xl gap-3 text-left text-sm text-white/65 sm:grid-cols-3">
            <div className="rounded-[20px] bg-white/10 p-4">Pending orders</div>
            <div className="rounded-[20px] bg-white/10 p-4">Ready to ship</div>
            <div className="rounded-[20px] bg-white/10 p-4">Delivered</div>
          </div>
        </>
      )}
    </div>
  );
}

function AnalyticsTab({ metrics, products }: { metrics: SellerMetrics; products: DemoSellerProduct[] }) {
  const maxSales = Math.max(...products.map((product) => product.sales), 1);
  const approvedProducts = products.filter((product) => product.status === "Approved");
  const topProducts = [...approvedProducts].sort((left, right) => right.sales - left.sales).slice(0, 3);
  const worstProducts = [...approvedProducts].sort((left, right) => left.sales - right.sales).slice(0, 3);
  const lowStock = products.filter((product) => product.stock <= 3);
  const addToCart = products.reduce((total, product) => total + product.addToCartCount, 0);

  if (metrics.views === 0 && metrics.orders === 0) {
    return (
      <div className="rounded-3xl border border-white/15 bg-white/5 p-10 text-center shadow-royal backdrop-blur-xl">
        <BarChart3 className="mx-auto h-10 w-10 text-champagne" />
        <h2 className="mt-5 font-display text-4xl text-white">No activity yet.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/60">
          Share your approved products to get started. Views, carts, and demo orders will update here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MetricGrid metrics={metrics} />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-royal backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-champagne">Sales over time</p>
          <div className="mt-6 flex h-56 items-end gap-3">
            {[8, 12, 10, 18, 16, 24, 28].map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-[8px] bg-champagne" style={{ height: `${value * 6}px` }} />
                <span className="text-xs text-white/45">D{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-royal backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-champagne">Views vs orders</p>
          <div className="mt-6 space-y-4">
            {products.map((product) => (
              <div key={product.id}>
                <div className="flex justify-between text-sm text-white/70">
                  <span>{product.name}</span>
                  <span>{product.views} views / {product.sales} orders</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-white/10">
                  <div className="h-3 rounded-full bg-champagne" style={{ width: `${Math.max((product.sales / maxSales) * 100, 8)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-royal backdrop-blur-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-champagne">Conversion funnel</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: "Views", value: metrics.views },
            { label: "Add to cart", value: addToCart },
            { label: "Purchase", value: metrics.orders }
          ].map((step) => (
            <div key={step.label} className="rounded-[24px] bg-white/10 p-5">
              <p className="font-display text-4xl text-white">{step.value}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ProductPerformanceList title="Top performing products" products={topProducts} />
        <ProductPerformanceList title="Worst performing products" products={worstProducts} />
        <ProductPerformanceList title="Low stock alerts" products={lowStock} emptyText="No low stock products." />
      </div>
    </div>
  );
}

function ProductPerformanceList({
  title,
  products,
  emptyText = "No products available."
}: {
  title: string;
  products: DemoSellerProduct[];
  emptyText?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-royal backdrop-blur-xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-champagne">{title}</p>
      <div className="mt-5 space-y-3">
        {products.length > 0 ? (
          products.map((product) => (
            <div key={product.id} className="rounded-[20px] bg-white/10 p-4 text-sm text-white/70">
              <p className="font-semibold text-white">{product.name}</p>
              <p className="mt-1">
                {product.sales} sales, {product.stock} stock
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-[20px] bg-white/10 p-4 text-sm text-white/55">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

function EditProductPanel({
  product,
  updateEditedProduct,
  onClose
}: {
  product: DemoSellerProduct;
  updateEditedProduct: (
    key: keyof Pick<DemoSellerProduct, "name" | "price" | "stock" | "status" | "description" | "imageUrl" | "category" | "material" | "yarnType" | "additionalImageUrls">,
    value: string
  ) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-royal/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-[#fbf7f2] p-6 text-royal shadow-royal sm:p-8">
        <h2 className="font-display text-4xl">Edit product</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SellerField id="edit-name" label="Product name" value={product.name} onChange={(value) => updateEditedProduct("name", value)} />
          <SellerField id="edit-price" label="Price" type="number" value={String(product.price)} onChange={(value) => updateEditedProduct("price", value)} />
          <SellerField id="edit-stock" label="Stock" type="number" value={String(product.stock)} onChange={(value) => updateEditedProduct("stock", value)} />
          <SellerField id="edit-image" label="Image URL" value={product.imageUrl} onChange={(value) => updateEditedProduct("imageUrl", value)} />
          
          <label htmlFor="edit-status" className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-royal/55">Status</span>
            <select
              id="edit-status"
              value={product.status}
              onChange={(event) => updateEditedProduct("status", event.target.value as DemoProductStatus)}
              className="mt-2 w-full rounded-[18px] border border-royal/10 bg-white px-4 py-3 text-sm text-royal outline-none"
            >
              <option>Draft</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </label>

          <SellerField id="edit-category" label="Category" value={product.category} onChange={(value) => updateEditedProduct("category", value)} />
          <SellerField id="edit-material" label="Material" value={product.material} onChange={(value) => updateEditedProduct("material", value)} />
          <SellerField id="edit-yarn" label="Yarn Type" value={product.yarnType} onChange={(value) => updateEditedProduct("yarnType", value)} />
          
          <div className="md:col-span-2">
            <SellerField id="edit-additional-images" label="Additional Images (comma separated)" value={(product.additionalImageUrls || []).join(", ")} onChange={(value) => updateEditedProduct("additionalImageUrls", value)} />
          </div>

          <div className="md:col-span-2">
            <SellerField id="edit-description" label="Description" value={product.description} onChange={(value) => updateEditedProduct("description", value)} />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="button-primary">
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductPreviewPanel({
  product,
  onClose
}: {
  product: DemoSellerProduct;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-royal/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-[#fbf7f2] text-royal shadow-royal">
        <div className="relative h-64 w-full">
          <Image src={product.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 576px" className="object-cover" />
        </div>
        <div className="p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/55">
            Seller preview
          </p>
          <h2 className="mt-3 font-display text-4xl">{product.name}</h2>
          <p className="mt-3 text-sm text-royal/70">
            {product.category} product made with {product.material}. This preview is UI-only and does not publish a public route.
          </p>
          <div className="mt-5 flex items-center justify-between">
            <span className="font-display text-3xl">{formatCurrency(product.price)}</span>
            <span className="rounded-full bg-royal/5 px-4 py-2 text-sm font-semibold">{product.status}</span>
          </div>
          <button type="button" onClick={onClose} className="button-primary mt-6 w-full justify-center">
            Close preview
          </button>
        </div>
      </div>
    </div>
  );
}
