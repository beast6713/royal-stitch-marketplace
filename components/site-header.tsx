"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Crown, Heart, Search, ShoppingBag, Sparkles, UserCircle2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { MARKETPLACE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CartResponse = {
  cart?: {
    items: Array<{ quantity: number }>;
  };
};

const navigation = [
  { href: "/#collection", label: "Shop" },
  { href: "/categories", label: "Categories" },
  { href: "/seller", label: "Sell" }
] as const;

export function SiteHeader({ clerkConfigured = false }: { clerkConfigured?: boolean }) {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    async function loadCartCount() {
      try {
        const response = await fetch("/api/cart", { cache: "no-store" });
        const data = (await response.json()) as CartResponse;
        const count =
          data.cart?.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0) ?? 0;
        setCartCount(count);
      } catch {
        setCartCount(0);
      }
    }

    void loadCartCount();
    window.addEventListener("royal-cart-changed", loadCartCount);
    return () => window.removeEventListener("royal-cart-changed", loadCartCount);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[#eadfce] bg-[#f8f2ea]/90 backdrop-blur-xl">
      <div className="shell py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-royal text-white shadow-glow">
              <Crown className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8e6f4f]">
                Handmade with care
              </p>
              <p className="truncate text-xl font-semibold text-royal">{MARKETPLACE_NAME}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <HeaderIconLink href="/wishlist" label="Wishlist" active={pathname.startsWith("/wishlist")}>
              <Heart className="h-[18px] w-[18px]" />
            </HeaderIconLink>

            <HeaderCartButton cartCount={cartCount} active={pathname.startsWith("/cart")} />

            {clerkConfigured ? (
              <ConfiguredAccountAction pathname={pathname} />
            ) : (
              <HeaderIconLink href="/account" label="Account" active={pathname.startsWith("/account")}>
                <UserCircle2 className="h-[18px] w-[18px]" />
              </HeaderIconLink>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
          <form action="/" method="GET" className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-royal/45" />
            <input
              type="search"
              name="query"
              placeholder="Search handmade items..."
              className="w-full rounded-full border border-[#e6dac9] bg-white/92 py-3 pl-11 pr-28 text-sm text-royal shadow-sm outline-none transition focus:border-royal/25 focus:ring-2 focus:ring-royal/10"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-royal px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-royal-soft"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 xl:min-w-fit xl:justify-end">
            <nav className="flex flex-wrap items-center gap-2">
              {navigation.map((item) => {
                const isActive =
                  item.href === "/#collection"
                    ? pathname === "/" || pathname.startsWith("/products")
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      isActive
                        ? "bg-royal text-white shadow-sm"
                        : "bg-white/85 text-royal hover:bg-white"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="tag hidden md:inline-flex">
              <Sparkles className="h-3.5 w-3.5" />
              Warm, one-of-a-kind finds
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderIconLink({
  href,
  label,
  active,
  children
}: {
  href: string;
  label: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e6dac9] bg-white/88 text-royal shadow-sm transition hover:scale-[1.02] hover:bg-white",
        active && "border-royal/20 bg-royal text-white"
      )}
    >
      {children}
    </Link>
  );
}

function HeaderCartButton({
  cartCount,
  active
}: {
  cartCount: number;
  active: boolean;
}) {
  return (
    <HeaderIconLink href="/cart" label="Cart" active={active}>
      <ShoppingBag className="h-[18px] w-[18px]" />
      {cartCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-white">
          {cartCount}
        </span>
      ) : null}
    </HeaderIconLink>
  );
}

function ConfiguredAccountAction({ pathname }: { pathname: string }) {
  const accountActive = pathname.startsWith("/account");

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            aria-label="Account"
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e6dac9] bg-white/88 text-royal shadow-sm transition hover:scale-[1.02] hover:bg-white",
              accountActive && "border-royal/20 bg-royal text-white"
            )}
          >
            <UserCircle2 className="h-[18px] w-[18px]" />
          </button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e6dac9] bg-white/88 shadow-sm">
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
    </>
  );
}
