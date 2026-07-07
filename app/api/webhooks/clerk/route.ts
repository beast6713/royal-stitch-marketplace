import { NextRequest, NextResponse } from "next/server";
import type { DeletedObjectJSON, UserJSON, WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { env, isClerkWebhookConfigured } from "@/lib/env";
import { createRequestContext, logError, logInfo, logWarn } from "@/lib/logger";
import { deleteMarketplaceProfile, syncMarketplaceProfileFromWebhook } from "@/lib/profiles";

export const runtime = "nodejs";

function getPrimaryEmail(user: UserJSON) {
  return (
    user.email_addresses.find((email) => email.id === user.primary_email_address_id)?.email_address ??
    user.email_addresses[0]?.email_address ??
    null
  );
}

function getDisplayName(user: UserJSON) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  if (user.username) {
    return user.username;
  }

  const email = getPrimaryEmail(user);

  if (email) {
    return email.split("@")[0];
  }

  return "Marketplace User";
}

function withRequestId(response: NextResponse, requestId: string) {
  response.headers.set("x-request-id", requestId);
  return response;
}

export async function POST(request: NextRequest) {
  const requestContext = createRequestContext(request);

  if (!isClerkWebhookConfigured()) {
    logWarn(
      "api.webhooks.clerk.unavailable",
      "Received a Clerk webhook without complete webhook configuration.",
      requestContext
    );
    return withRequestId(
      NextResponse.json(
        { error: "Clerk webhook handling is not configured." },
        { status: 503 }
      ),
      requestContext.requestId
    );
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    logWarn(
      "api.webhooks.clerk.bad_headers",
      "Clerk webhook request is missing Svix verification headers.",
      requestContext
    );
    return withRequestId(
      NextResponse.json({ error: "Missing Svix headers." }, { status: 400 }),
      requestContext.requestId
    );
  }

  const payload = await request.text();
  const webhook = new Webhook(env.CLERK_WEBHOOK_SECRET!);
  let event: WebhookEvent;

  try {
    event = webhook.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature
    }) as WebhookEvent;
  } catch (error) {
    logError(
      "api.webhooks.clerk.verification_failed",
      "Unable to verify Clerk webhook signature.",
      error,
      requestContext
    );
    return withRequestId(
      NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 }),
      requestContext.requestId
    );
  }

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      const user = event.data as UserJSON;

      await syncMarketplaceProfileFromWebhook({
        sellerClerkId: user.id,
        fullName: getDisplayName(user),
        email: getPrimaryEmail(user),
        avatarUrl: user.image_url
      });

      logInfo("api.webhooks.clerk.user_synced", "Synced Clerk user into marketplace profile.", {
        ...requestContext,
        clerkEvent: event.type,
        userId: user.id
      });
    }

    if (event.type === "user.deleted") {
      const deletedUser = event.data as DeletedObjectJSON;

      if (deletedUser.id) {
        await deleteMarketplaceProfile(deletedUser.id);
      }

      logInfo("api.webhooks.clerk.user_deleted", "Deleted marketplace profile after Clerk event.", {
        ...requestContext,
        clerkEvent: event.type,
        userId: deletedUser.id ?? null
      });
    }

    return withRequestId(NextResponse.json({ ok: true }), requestContext.requestId);
  } catch (error) {
    logError(
      "api.webhooks.clerk.sync_failed",
      "Clerk webhook processing failed while syncing marketplace data.",
      error,
      {
        ...requestContext,
        clerkEvent: event.type
      }
    );
    return withRequestId(
      NextResponse.json({ error: "Unable to process Clerk webhook event." }, { status: 503 }),
      requestContext.requestId
    );
  }
}
