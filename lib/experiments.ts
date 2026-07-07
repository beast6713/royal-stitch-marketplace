import type { NextRequest, NextResponse } from "next/server";
import type {
  ExperimentAssignments,
  ExperimentVariant,
  FunnelVariant,
  RankingVariant
} from "@/lib/types";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export const EXPERIMENT_COOKIE_NAMES = {
  homeFeed: "rs_exp_home",
  searchRanking: "rs_exp_rank",
  checkoutFunnel: "rs_exp_funnel"
} as const;

const HOME_FEED_VARIANTS = ["atelier", "treasure"] as const satisfies readonly ExperimentVariant[];
const SEARCH_RANKING_VARIANTS = ["relevance", "trend"] as const satisfies readonly RankingVariant[];
const CHECKOUT_FUNNEL_VARIANTS = ["guided", "express"] as const satisfies readonly FunnelVariant[];

function hashSeed(seed: string) {
  return Array.from(seed).reduce((total, character, index) => {
    return total + character.charCodeAt(0) * (index + 17);
  }, 0);
}

function pickVariant<TVariant extends string>(
  seed: string,
  variants: readonly TVariant[]
): TVariant {
  const bucket = hashSeed(seed) % variants.length;
  return variants[bucket] ?? variants[0];
}

function isHomeVariant(value: string | undefined): value is ExperimentVariant {
  return HOME_FEED_VARIANTS.includes(value as ExperimentVariant);
}

function isRankingVariant(value: string | undefined): value is RankingVariant {
  return SEARCH_RANKING_VARIANTS.includes(value as RankingVariant);
}

function isFunnelVariant(value: string | undefined): value is FunnelVariant {
  return CHECKOUT_FUNNEL_VARIANTS.includes(value as FunnelVariant);
}

export function resolveExperimentAssignments(seed: string): ExperimentAssignments {
  return {
    homeFeed: pickVariant(`${seed}:home`, HOME_FEED_VARIANTS),
    searchRanking: pickVariant(`${seed}:rank`, SEARCH_RANKING_VARIANTS),
    checkoutFunnel: pickVariant(`${seed}:funnel`, CHECKOUT_FUNNEL_VARIANTS)
  };
}

export function readExperimentAssignments(
  cookieStore: CookieReader,
  fallbackSeed = "royal-stitch-market"
): ExperimentAssignments {
  const cookieHome = cookieStore.get(EXPERIMENT_COOKIE_NAMES.homeFeed)?.value;
  const cookieRanking = cookieStore.get(EXPERIMENT_COOKIE_NAMES.searchRanking)?.value;
  const cookieFunnel = cookieStore.get(EXPERIMENT_COOKIE_NAMES.checkoutFunnel)?.value;
  const fallback = resolveExperimentAssignments(fallbackSeed);

  return {
    homeFeed: isHomeVariant(cookieHome) ? cookieHome : fallback.homeFeed,
    searchRanking: isRankingVariant(cookieRanking) ? cookieRanking : fallback.searchRanking,
    checkoutFunnel: isFunnelVariant(cookieFunnel) ? cookieFunnel : fallback.checkoutFunnel
  };
}

export function applyExperimentCookies(request: NextRequest, response: NextResponse) {
  const existingHome = request.cookies.get(EXPERIMENT_COOKIE_NAMES.homeFeed)?.value;
  const existingRanking = request.cookies.get(EXPERIMENT_COOKIE_NAMES.searchRanking)?.value;
  const existingFunnel = request.cookies.get(EXPERIMENT_COOKIE_NAMES.checkoutFunnel)?.value;

  if (existingHome && existingRanking && existingFunnel) {
    return response;
  }

  const requestSeed = [
    request.headers.get("user-agent"),
    request.headers.get("accept-language"),
    request.headers.get("x-forwarded-for"),
    request.nextUrl.pathname
  ]
    .filter(Boolean)
    .join(":");
  const assignments = resolveExperimentAssignments(requestSeed || "royal-stitch-market");
  const cookieOptions = {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  };

  response.cookies.set(
    EXPERIMENT_COOKIE_NAMES.homeFeed,
    existingHome ?? assignments.homeFeed,
    cookieOptions
  );
  response.cookies.set(
    EXPERIMENT_COOKIE_NAMES.searchRanking,
    existingRanking ?? assignments.searchRanking,
    cookieOptions
  );
  response.cookies.set(
    EXPERIMENT_COOKIE_NAMES.checkoutFunnel,
    existingFunnel ?? assignments.checkoutFunnel,
    cookieOptions
  );

  return response;
}
