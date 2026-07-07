import "server-only";
import { randomUUID } from "crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserDisplayName } from "@/lib/auth";
import { isClerkConfigured } from "@/lib/env";
import type { BuyerIdentity } from "@/lib/types";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export const GUEST_BUYER_COOKIE = "rs_guest_id";

export type ViewerIdentityResult = BuyerIdentity & {
  guestCookieValue?: string;
};

function createGuestBuyerId() {
  return `guest_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export async function getViewerIdentity(cookieStore: CookieReader): Promise<ViewerIdentityResult> {
  if (isClerkConfigured()) {
    const { userId } = await auth();

    if (userId) {
      const user = await currentUser();

      return {
        buyerId: userId,
        buyerName: user ? getUserDisplayName(user) : "Marketplace buyer",
        isAuthenticated: true
      };
    }
  }

  const existingGuestId = cookieStore.get(GUEST_BUYER_COOKIE)?.value;

  if (existingGuestId) {
    return {
      buyerId: existingGuestId,
      buyerName: "Guest shopper",
      isAuthenticated: false
    };
  }

  const nextGuestId = createGuestBuyerId();

  return {
    buyerId: nextGuestId,
    buyerName: "Guest shopper",
    isAuthenticated: false,
    guestCookieValue: nextGuestId
  };
}
