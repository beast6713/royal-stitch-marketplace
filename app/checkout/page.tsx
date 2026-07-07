import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { CartCheckoutPanel } from "@/components/cart-checkout-panel";
import { getCartSnapshot } from "@/lib/cart";
import { getViewerIdentity } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const viewer = await getViewerIdentity(cookieStore);
  const cart = await getCartSnapshot({
    buyerId: viewer.buyerId,
    cookieStore
  });

  return (
    <main className="shell py-8 pb-20">
      <section className="panel overflow-hidden bg-white/40 px-6 py-8 sm:px-12">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="tag">
              <ShoppingBag className="h-3.5 w-3.5" />
              Checkout
            </div>
            <h1 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">
              Complete your order.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-royal/70 sm:text-base">
              Add a delivery address, choose a payment method, and complete your secure payment.
            </p>
          </div>
          <Link href="/cart" className="button-secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to cart
          </Link>
        </div>
      </section>

      {cart.items.length > 0 ? (
        <div className="mt-8">
          <CartCheckoutPanel total={cart.total} cart={cart} />
        </div>
      ) : (
        <section className="panel mt-8 p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-royal/5 text-royal">
            <ShoppingBag className="h-7 w-7 text-gold" />
          </div>
          <h2 className="mt-6 font-display text-4xl text-royal">Your cart is empty.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-royal/70">
            Add a handmade item before opening checkout.
          </p>
          <Link href="/" className="button-primary mt-8">
            Explore products
          </Link>
        </section>
      )}
    </main>
  );
}
