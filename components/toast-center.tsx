"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ToastPayload } from "@/lib/client-toast";

type ToastState = ToastPayload & {
  id: number;
};

export function ToastCenter() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const detail = (event as CustomEvent<ToastPayload>).detail;

      if (!detail) {
        return;
      }

      const nextToast = {
        id: Date.now() + Math.round(Math.random() * 1000),
        ...detail
      };

      setToasts((current) => [...current, nextToast].slice(-3));
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== nextToast.id));
      }, 2600);
    }

    window.addEventListener("royal-toast", handleToast);
    return () => window.removeEventListener("royal-toast", handleToast);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-md flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-[22px] border border-white/70 bg-white/95 px-4 py-3 shadow-royal backdrop-blur"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-pine/10 p-2 text-pine">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-royal">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-sm text-slate-600">{toast.description}</p>
                ) : null}
              </div>
              <X className="mt-1 h-4 w-4 text-slate-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
