"use client";

import { LoaderCircle, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { pushMarketplaceToast } from "@/lib/client-toast";

export function ReviewForm({
  productId,
  productName,
  signedIn
}: {
  productId: string;
  productName: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const response = await fetch("/api/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            productId,
            rating,
            title: String(formData.get("title") ?? ""),
            body: String(formData.get("body") ?? ""),
            mediaUrl: String(formData.get("mediaUrl") ?? "").trim() || null,
            sizeInsight: String(formData.get("sizeInsight") ?? "").trim() || null
          })
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to submit the review.");
        }

        pushMarketplaceToast({
          title: "Review submitted",
          description: `Thanks for reviewing ${productName}.`
        });
        setFormKey((value) => value + 1);
        setRating(5);
        router.refresh();
      } catch (error) {
        pushMarketplaceToast({
          title: "Review failed",
          description: error instanceof Error ? error.message : "Please try again."
        });
      }
    });
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="rounded-[24px] bg-white/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-royal/60">
            Write a review
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {signedIn
              ? "Verified purchase tagging is applied automatically when your order history matches this product."
              : "Guest reviews are allowed, but verified purchase tagging works best when you sign in."}
          </p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, index) => {
            const value = index + 1;
            const active = value <= rating;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`rounded-full p-2 transition ${
                  active ? "bg-gold/15 text-gold" : "bg-royal/5 text-royal/45"
                }`}
                aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
              >
                <Star className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className="text-sm font-medium text-slate-700">
            Title
          </label>
          <input id="title" name="title" required className="field" placeholder="Worth gifting" />
        </div>
        <div>
          <label htmlFor="sizeInsight" className="text-sm font-medium text-slate-700">
            Size / fit insight
          </label>
          <input
            id="sizeInsight"
            name="sizeInsight"
            className="field"
            placeholder="True to size, roomy, mini, queen-size..."
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="body" className="text-sm font-medium text-slate-700">
          Review
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={4}
          className="field resize-none"
          placeholder="Share quality, delivery, feel, gifting value, or reseller experience."
        />
      </div>

      <div className="mt-4">
        <label htmlFor="mediaUrl" className="text-sm font-medium text-slate-700">
          Image / video URL
        </label>
        <input
          id="mediaUrl"
          name="mediaUrl"
          type="url"
          className="field"
          placeholder="https://..."
        />
      </div>

      <button type="submit" disabled={isPending} className="button-primary mt-5">
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
