"use client";

import { useState } from "react";
import { CreditCard, LoaderCircle, ShieldAlert } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MockPaymentProviderProps {
  method: "cod" | "upi" | "card";
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  isProcessingOverride?: boolean;
}

export function MockPaymentProvider({
  method,
  amount,
  onSuccess,
  onCancel,
  isProcessingOverride = false
}: MockPaymentProviderProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    // Simulate network delay for payment gateway
    setTimeout(() => {
      onSuccess();
    }, 1500);
  };

  const loading = isProcessing || isProcessingOverride;

  return (
    <div className="rounded-[24px] border border-gold/20 bg-gold/5 p-6 shadow-sm">
      <div className="flex items-center gap-3 text-gold mb-4">
        <ShieldAlert className="h-5 w-5" />
        <h3 className="font-display text-xl text-royal">Simulated Secure Checkout</h3>
      </div>
      <p className="text-sm text-royal/70 mb-6">
        This is a demonstration environment. No real funds or personal credentials will be processed.
      </p>

      {method === "cod" ? (
        <div className="rounded-2xl bg-white/60 p-4 border border-royal/10 text-sm text-royal mb-6 font-medium">
          Cash on delivery selected. You will pay {formatCurrency(amount)} at your doorstep.
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          <div className="rounded-2xl bg-white/60 p-4 border border-royal/10">
            <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-royal/50 mb-1">Demo Amount</p>
            <p className="font-display text-2xl text-royal">{formatCurrency(amount)}</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-4 border border-royal/10 text-sm text-royal/60">
            {method === "upi" ? "Simulating UPI Intent approval..." : "Simulating 3D Secure / OTP verification..."}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleSimulatePayment}
          disabled={loading}
          className="button-primary flex-1 justify-center bg-gold text-white hover:bg-gold/90"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {loading ? "Processing..." : `Simulate ${method === "cod" ? "Order" : "Payment"}`}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="button-secondary bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
