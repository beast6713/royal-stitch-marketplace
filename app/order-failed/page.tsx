import Link from "next/link";
import { AlertTriangle, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ResultSearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: ResultSearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function OrderFailedPage({
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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-700">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-royal/60">
          Demo order failed
        </p>
        <h1 className="mt-4 font-display text-5xl tracking-tight text-royal">
          Payment was not completed.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-royal/70">
          This is the optional failure state for testing. Your cart items were kept so you can retry.
        </p>

        <div className="mx-auto mt-8 max-w-md rounded-[24px] bg-royal/5 p-5">
          <CreditCard className="mx-auto h-5 w-5 text-gold" />
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-royal/50">
            Attempted payment
          </p>
          <p className="mt-2 text-lg font-semibold capitalize text-royal">
            {method} / {formatCurrency(total)}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/checkout" className="button-primary">
            Try checkout again
          </Link>
          <Link href="/cart" className="button-secondary">
            Back to cart
          </Link>
        </div>
      </section>
    </main>
  );
}
