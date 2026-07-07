export type ToastPayload = {
  title: string;
  description?: string;
};

export function pushMarketplaceToast(payload: ToastPayload) {
  if (typeof window === "undefined") {
    return;
  }

  // Predefined toast types for e-commerce actions
  const toastTypes = {
    cartAdded: { title: "Added to cart!", description: "Item ready for checkout." },
    wishlistAdded: { title: "Added to wishlist ❤️", description: "We'll notify when back in stock." },
    wishlistRemoved: { title: "Removed from wishlist", description: "" },
    cartRemoved: { title: "Removed from cart", description: "" },
    filterApplied: { title: "Filters updated", description: "Showing best matches." }
  };

  const matchedToast = payload.title.includes("Added to cart") 
    ? toastTypes.cartAdded 
    : payload.title.includes("Wishlisted") 
      ? toastTypes.wishlistAdded 
      : toastTypes.filterApplied;

  window.dispatchEvent(new CustomEvent("royal-toast", { detail: { ...matchedToast, ...payload } }));
}

export function notifyCartChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("royal-cart-changed"));
}

export function triggerMarketplaceHaptics() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(12);
  }
}
