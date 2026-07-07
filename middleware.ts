import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isClerkConfigured } from "@/lib/env";
import { applyExperimentCookies } from "@/lib/experiments";

const isProtectedRoute = createRouteMatcher(["/seller(.*)"]);
const clerkConfigured = isClerkConfigured();

const middleware = clerkConfigured
  ? clerkMiddleware(async (auth, request) => {
      if (isProtectedRoute(request)) {
        await auth.protect();
      }

      return applyExperimentCookies(request, NextResponse.next());
    })
  : (request: NextRequest) => {
      return applyExperimentCookies(request, NextResponse.next());
    };

export default middleware;

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"]
};
