"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell py-10">
      <div className="panel-dark mx-auto max-w-3xl p-8 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-champagne">
          <AlertTriangle className="h-4 w-4" />
          Something went wrong
        </div>
        <h1 className="mt-5 text-5xl text-white">The marketplace hit an unexpected error.</h1>
        <p className="mt-4 max-w-2xl text-base text-white/75">
          The page failed safely and no product data was changed. Try the request again, and if it
          keeps happening, check the server logs for the underlying exception.
        </p>
        <div className="mt-6 rounded-[24px] border border-white/10 bg-white/10 p-4 text-sm text-white/75">
          {error.message}
        </div>
        <button type="button" onClick={reset} className="button-primary mt-6 bg-white text-royal hover:bg-champagne">
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </main>
  );
}
