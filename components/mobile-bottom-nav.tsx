"use client";

import Link from "next/link";
import { Home, LayoutGrid, Package, ShoppingBag, UserCircle2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type CartResponse = {
  cart?: {
    items: Array<{ quantity: number }>;
  };
};

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/categories", label: "Categories", icon: LayoutGrid },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/account", label: "Account", icon: UserCircle2 }
];

export function MobileBottomNav() {
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
    <>
      {pathname !== "/cart" ? (
        <Link
          href="/cart"
          className={cn(
            "fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-royal px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(16,37,66,0.28)] transition hover:scale-[1.02] lg:hidden",
            cartCount === 0 && "opacity-90"
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>{cartCount > 0 ? `${cartCount} in cart` : "Open cart"}</span>
        </Link>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/94 px-3 py-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-5 gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/products")
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-[20px] px-2 py-3 text-center text-xs font-semibold transition",
                  isActive ? "bg-royal text-white shadow-sm" : "text-royal/70 hover:bg-royal/5"
                )}
              >
                <Icon className="mx-auto h-5 w-5" />
                <span className="mt-1 block">{item.label}</span>
                {item.href === "/cart" && cartCount > 0 ? (
                  <span className="absolute right-2 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-white">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
