import { SignUp } from "@clerk/nextjs";
import { Crown, Sparkles } from "lucide-react";
import { isClerkConfigured } from "@/lib/env";

export default function SignUpPage() {
  if (!isClerkConfigured()) {
    return (
      <main className="shell flex min-h-[calc(100vh-5rem)] items-center py-10">
        <div className="panel-dark w-full p-8 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-champagne">
            <Crown className="h-4 w-4" />
            Authentication setup
          </div>
          <h1 className="mt-5 text-5xl text-white">Add Clerk keys to enable account creation.</h1>
          <p className="mt-4 max-w-2xl text-base text-white/75">
            Once Clerk is configured, buyers can register normally and seller access can be granted
            from the marketplace database in Supabase.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell flex min-h-[calc(100vh-5rem)] items-center py-10">
      <div className="panel-dark grid w-full overflow-hidden lg:grid-cols-[1fr,0.9fr]">
        <div className="flex flex-col justify-between gap-8 px-8 py-10 sm:px-10">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-champagne">
              <Crown className="h-4 w-4" />
              Join the marketplace
            </div>
            <h1 className="text-5xl text-white">Create an account and start collecting favorites.</h1>
            <p className="max-w-xl text-base text-white/75">
              Buyers can browse instantly, and seller accounts can be promoted later by updating the
              related `public.profiles.role` record to `seller`.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-white/75">
              <Sparkles className="h-5 w-5 text-champagne" />
              <p className="mt-3 text-sm font-semibold text-white">Fast onboarding with Clerk</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-white/75">
              <Sparkles className="h-5 w-5 text-champagne" />
              <p className="mt-3 text-sm font-semibold text-white">Protected seller dashboard later</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-white/8 px-6 py-10 sm:px-8">
          <SignUp signInUrl="/sign-in" />
        </div>
      </div>
    </main>
  );
}
