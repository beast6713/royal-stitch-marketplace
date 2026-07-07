"use client";

import { useRouter } from "next/navigation";
import { LoaderCircle, PackagePlus, Sparkles } from "lucide-react";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { CATEGORY_OPTIONS, MATERIAL_OPTIONS } from "@/lib/constants";
import { CloudinaryUpload } from "@/components/cloudinary-upload";

type FeedbackState =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

export function ProductForm({ disabledReason }: { disabledReason?: string }) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isPending, startTransition] = useTransition();
  const disabled = Boolean(disabledReason);

  function handleAutoDescription() {
    setDescription("Handcrafted with incredible care and precision, this piece is made from premium authentic yarn to deliver supreme comfort and style. Ideal for gifting or keeping for yourself!");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      description: description.trim(),
      price: Number(formData.get("price") ?? 0),
      material: String(formData.get("material") ?? "Wool"), // Simple defaults
      category: String(formData.get("category") ?? "Sweaters"),
      yarnType: "Premium Handpicked Yarn", // Defaulted MVP
      imageUrl: String(formData.get("imageUrl") ?? "").trim(),
      stockQuantity:
        String(formData.get("stockQuantity") ?? "").trim().length > 0
          ? Number(formData.get("stockQuantity") ?? 0)
          : 1, // default 1
    };

    startTransition(async () => {
      try {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to create the listing.");
        }

        setFeedback({
          type: "success",
          message: "Listing published successfully."
        });
        form.reset();
        setImageUrl("");
        setDescription("");
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Unable to create the listing."
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl p-6 sm:p-10 shadow-royal">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full backdrop-blur-md bg-white/10 border border-white/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-champagne shadow-sm">
            <PackagePlus className="h-3.5 w-3.5" />
            Quick Upload
          </div>
          <h2 className="mt-6 font-display text-4xl text-white">Publish in under 2 minutes</h2>
          <p className="mt-3 max-w-xl text-sm text-champagne/80 font-sans tracking-wide">
            Skip the complex details. Add your photo, auto-generate a description, and list your handmade piece effortlessly!
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Step 1: Image & Title */}
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h3 className="font-display text-2xl text-champagne mb-5 tracking-tight">Step 1: Product Photo & Name</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="text-xs font-bold uppercase tracking-[0.1em] text-white/50">Product Name</label>
              <input
                id="name"
                name="name"
                placeholder="e.g., Midnight Blue Cardigan"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-champagne focus:ring-1 focus:ring-champagne"
                disabled={disabled || isPending}
                required
              />
            </div>
            <div>
              <label htmlFor="imageUrl" className="text-xs font-bold uppercase tracking-[0.1em] text-white/50">Image URL</label>
              <input
                id="imageUrl"
                name="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://..."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-champagne focus:ring-1 focus:ring-champagne mb-3"
                disabled={disabled || isPending}
                required
              />
              <CloudinaryUpload value={imageUrl} onChange={setImageUrl} disabled={disabled || isPending} />
            </div>
          </div>
        </div>

        {/* Step 2: Description */}
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-2xl text-champagne tracking-tight">Step 2: Description</h3>
            <button
              type="button"
              onClick={handleAutoDescription}
              className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gold transition hover:bg-gold/20"
            >
              <Sparkles className="h-3.5 w-3.5" /> Auto-generate
            </button>
          </div>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write a few words about your item..."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-champagne resize-none"
            disabled={disabled || isPending}
            required
          />
        </div>

        {/* Step 3: Specifics */}
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h3 className="font-display text-2xl text-champagne mb-5 tracking-tight">Step 3: Details & Pricing</h3>
          <div className="grid gap-6 sm:grid-cols-3">
             <div>
              <label htmlFor="category" className="text-xs font-bold uppercase tracking-[0.1em] text-white/50">Category</label>
              <select id="category" name="category" defaultValue="Sweaters" className="mt-2 w-full rounded-2xl border border-white/10 bg-royal px-4 py-3 text-sm text-white outline-none transition focus:border-champagne" required>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="material" className="text-xs font-bold uppercase tracking-[0.1em] text-white/50">Material</label>
              <select id="material" name="material" defaultValue="Wool" className="mt-2 w-full rounded-2xl border border-white/10 bg-royal px-4 py-3 text-sm text-white outline-none transition focus:border-champagne" required>
                {MATERIAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="price" className="text-xs font-bold uppercase tracking-[0.1em] text-white/50">Price (₹)</label>
              <input
                id="price"
                name="price"
                type="number"
                min="1"
                placeholder="1500"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-champagne"
                disabled={disabled || isPending}
                required
              />
            </div>
            <div>
              <label htmlFor="stockQuantity" className="text-xs font-bold uppercase tracking-[0.1em] text-white/50">Available Stock</label>
              <input
                id="stockQuantity"
                name="stockQuantity"
                type="number"
                min="0"
                placeholder="1"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-champagne"
                disabled={disabled || isPending}
              />
            </div>
          </div>
        </div>
      </div>

      {disabledReason ? (
        <div className="mt-5 rounded-[24px] border border-gold/20 bg-gold/10 p-4 text-sm text-slate-700">
          {disabledReason}
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`mt-5 rounded-[24px] p-4 text-sm ${
            feedback.type === "success"
              ? "border border-pine/20 bg-pine/10 text-pine"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-champagne px-8 py-4 text-sm font-bold uppercase tracking-[0.1em] text-royal shadow-glow transition hover:scale-105 hover:bg-white w-full sm:w-auto"
          disabled={disabled || isPending}
        >
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
          {isPending ? "Publishing..." : "Publish Listing Fast"}
        </button>
      </div>
    </form>
  );
}
