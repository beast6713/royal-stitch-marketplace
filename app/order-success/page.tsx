import Link from "next/link";
import { CheckCircle2, PackageCheck, Store } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ResultSearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: ResultSearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function OrderSuccessPage({
  searchParams
}: {
  searchParams?: Promise<ResultSearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const method = getParam(resolvedSearchParams, "method") || "cod";
  const total = Number(getParam(resolvedSearchParams, "total") || 0);

  return (
    <main className="shell py-10 pb-20">
      <section className="panel mx-auto max-w-3xl p-8 text-center sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pine/10 text-pine">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-royal/60">
          Demo order successful
        </p>
        <h1 className="mt-4 font-display text-5xl tracking-tight text-royal">
          Your order has been placed.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-royal/70">
          This was a simulated checkout. No real payment was processed, and no payment gateway was contacted.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] bg-royal/5 p-5">
            <PackageCheck className="mx-auto h-5 w-5 text-gold" />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-royal/50">
              Payment method
            </p>
            <p className="mt-2 text-lg font-semibold capitalize text-royal">{method}</p>
          </div>
          <div className="rounded-[24px] bg-royal/5 p-5">
            <Store className="mx-auto h-5 w-5 text-gold" />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-royal/50">
              Demo total
            </p>
            <p className="mt-2 text-lg font-semibold text-royal">{formatCurrency(total)}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="button-primary">
            Continue shopping
          </Link>
          <Link href="/orders" className="button-secondary">
            View order hub
          </Link>
        </div>
      </section>
    </main>
  );
}
