import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processDueBackgroundJobs } from "@/lib/background-jobs";
import { createRequestContext, logError, logWarn } from "@/lib/logger";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestContext = createRequestContext(request);

  if (!env.JOB_RUNNER_SECRET) {
    return NextResponse.json({ error: "Job runner is not configured." }, { status: 503 });
  }

  if (request.headers.get("x-job-runner-secret") !== env.JOB_RUNNER_SECRET) {
    logWarn("api.jobs.unauthorized", "Rejected unauthorized background job runner request.", requestContext);
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rateLimit = checkRateLimit({
    key: `jobs:${getClientIp(request.headers)}`,
    limit: 20,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  try {
    const result = await processDueBackgroundJobs({
      limit: 10,
      context: requestContext
    });

    return NextResponse.json(result);
  } catch (error) {
    logError("api.jobs.failed", "Background job processing failed.", error, requestContext);
    return NextResponse.json({ error: "Unable to process jobs." }, { status: 500 });
  }
}
