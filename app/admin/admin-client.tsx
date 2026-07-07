"use client";

import { CheckCircle2, PackageSearch, ShieldCheck, Store, XCircle, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { deleteProduct } from "@/lib/actions/seller";
import { deleteSeller } from "@/lib/actions/admin";
import { useTransition } from "react";

export function AdminDashboardClient({ sellers, products }: { sellers: any[], products: any[] }) {
  const [isPending, startTransition] = useTransition();

  function handleDeleteSeller(id: string) {
    if (!confirm("Are you sure you want to delete this seller?")) return;
    startTransition(async () => {
      try {
        await deleteSeller(id);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  function handleDeleteProduct(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    startTransition(async () => {
      try {
        await deleteProduct(id);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  return (
    <main className="shell py-8 pb-20">
      <section className="panel bg-white/45 p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="tag">
              <ShieldCheck className="h-3.5 w-3.5" />
              Live Admin
            </div>
            <h1 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">
              Marketplace control room.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-royal/70">
              Manage all sellers and products across the platform directly from the database.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <AdminMetric label="Total sellers" value={String(sellers.length)} icon={Store} />
          <AdminMetric label="Total products" value={String(products.length)} icon={PackageSearch} />
        </div>
      </section>

      <section className="panel mt-8 p-6 sm:p-10">
        <h2 className="mt-2 font-display text-4xl text-royal">Sellers</h2>
        {sellers.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-3 text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.18em] text-royal/45">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Store Name</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => (
                  <tr key={seller.id} className="bg-royal/5">
                    <td className="rounded-l-[22px] px-3 py-4 font-semibold text-royal">
                      {seller.profiles?.full_name ?? "Unknown"}
                    </td>
                    <td className="px-3 py-4 text-royal/70">{seller.profiles?.email ?? "No email"}</td>
                    <td className="px-3 py-4 font-medium text-royal/80">{seller.store_name}</td>
                    <td className="rounded-r-[22px] px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <AdminAction label="Delete" icon={Trash2} tone="danger" onClick={() => handleDeleteSeller(seller.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyAdminState message="No sellers yet." />
        )}
      </section>

      <section className="panel mt-8 p-6 sm:p-10">
        <h2 className="mt-2 font-display text-4xl text-royal">Products</h2>
        {products.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-y-3 text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.18em] text-royal/45">
                <tr>
                  <th className="px-3 py-2">Product name</th>
                  <th className="px-3 py-2">Seller name</th>
                  <th className="px-3 py-2">Price</th>
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
                    <td className="px-3 py-4 text-royal/70">{product.seller_name}</td>
                    <td className="px-3 py-4 text-royal/70">{formatCurrency(product.price)}</td>
                    <td className="rounded-r-[22px] px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <AdminAction label="Delete" icon={Trash2} tone="danger" onClick={() => handleDeleteProduct(product.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyAdminState message="No products yet." />
        )}
      </section>
    </main>
  );
}

function AdminMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Store }) {
  return (
    <div className="rounded-[24px] border border-white/20 bg-white/80 p-5 shadow-sm">
      <Icon className="h-5 w-5 text-gold" />
      <p className="mt-4 font-display text-4xl text-royal">{value}</p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-royal/50">{label}</p>
    </div>
  );
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
