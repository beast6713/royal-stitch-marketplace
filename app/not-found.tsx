import Link from "next/link";
import { Compass, Home } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <main className="shell py-10">
      <div className="panel-dark mx-auto max-w-3xl p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-champagne">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-5xl text-white">That page has slipped off the pattern board.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/75">
          The route could not be found. Head back to the gallery to keep exploring handmade pieces.
        </p>
        <Link href="/" className="button-primary mt-6 bg-white text-royal hover:bg-champagne">
          <Home className="h-4 w-4" />
          Return home
        </Link>
      </div>
    </main>
  );
}
