"use client";

import { Share2 } from "lucide-react";

export function WhatsAppShareButton({
  productName,
  productPath,
}: {
  productName: string;
  productPath: string;
}) {
  function handleShare() {
    const fullUrl = `${window.location.origin}${productPath}`;
    const text = `Check out this handcrafted ${productName} on Royal Stitch!\n${fullUrl}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-[#25D366]/30 bg-white/60 px-5 py-3 text-sm font-semibold text-[#128C7E] shadow-sm transition hover:bg-[#25D366]/10"
    >
      <Share2 className="h-4 w-4" />
      Share via WhatsApp
    </button>
  );
}
