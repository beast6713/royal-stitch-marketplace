import { z } from "zod";

const optionalString = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().min(1).optional()
);

const optionalUrl = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().url().optional()
);

const optionalDemoMode = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.enum(["true", "false"]).optional().default("false")
);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalString,
    CLERK_SECRET_KEY: optionalString,
    CLERK_WEBHOOK_SECRET: optionalString,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: optionalString,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: optionalString,
    NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
    SUPABASE_SERVICE_ROLE_KEY: optionalString,
    ENABLE_DEMO_MODE: optionalDemoMode,
    MONITORING_WEBHOOK_URL: optionalUrl,
    RAZORPAY_KEY_ID: optionalString,
    RAZORPAY_KEY_SECRET: optionalString,
    RAZORPAY_WEBHOOK_SECRET: optionalString,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: optionalString,
    JOB_RUNNER_SECRET: optionalString,
    ORDER_EMAIL_WEBHOOK_URL: optionalUrl,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: optionalString,
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: optionalString
  })
  .superRefine((value, ctx) => {
    const hasClerkAuthValue = Boolean(
      value.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || value.CLERK_SECRET_KEY
    );

    if (hasClerkAuthValue && !value.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
        message: "Clerk auth requires NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY."
      });
    }

    if (hasClerkAuthValue && !value.CLERK_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLERK_SECRET_KEY"],
        message: "Clerk auth requires CLERK_SECRET_KEY."
      });
    }

    const hasSupabaseValue = Boolean(
      value.NEXT_PUBLIC_SUPABASE_URL ||
        value.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        value.SUPABASE_SERVICE_ROLE_KEY
    );

    if (hasSupabaseValue && !value.NEXT_PUBLIC_SUPABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
        message: "Supabase configuration requires NEXT_PUBLIC_SUPABASE_URL."
      });
    }

    if (hasSupabaseValue && !value.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
        message: "Supabase reads require NEXT_PUBLIC_SUPABASE_ANON_KEY."
      });
    }

    const hasCloudinaryValue = Boolean(
      value.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || value.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    );

    if (hasCloudinaryValue && !value.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"],
        message: "Cloudinary uploads require NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME."
      });
    }

    if (hasCloudinaryValue && !value.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET"],
        message: "Cloudinary uploads require NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
      });
    }

    if (value.CLERK_WEBHOOK_SECRET && !value.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SUPABASE_SERVICE_ROLE_KEY"],
        message: "Clerk webhook sync requires SUPABASE_SERVICE_ROLE_KEY."
      });
    }

    const hasRazorpayValue = Boolean(
      value.RAZORPAY_KEY_ID ||
        value.RAZORPAY_KEY_SECRET ||
        value.RAZORPAY_WEBHOOK_SECRET ||
        value.NEXT_PUBLIC_RAZORPAY_KEY_ID
    );

    if (hasRazorpayValue && !value.RAZORPAY_KEY_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RAZORPAY_KEY_ID"],
        message: "Razorpay server order creation requires RAZORPAY_KEY_ID."
      });
    }

    if (hasRazorpayValue && !value.RAZORPAY_KEY_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RAZORPAY_KEY_SECRET"],
        message: "Razorpay payment verification requires RAZORPAY_KEY_SECRET."
      });
    }

    if (value.RAZORPAY_WEBHOOK_SECRET && !value.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SUPABASE_SERVICE_ROLE_KEY"],
        message: "Razorpay webhook processing requires SUPABASE_SERVICE_ROLE_KEY."
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = {
  ...parsedEnv.data,
  ENABLE_DEMO_MODE: parsedEnv.data.ENABLE_DEMO_MODE === "true"
};

export function isClerkConfigured() {
  return Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY);
}

export function isClerkWebhookConfigured() {
  return Boolean(env.CLERK_WEBHOOK_SECRET && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isRazorpayConfigured() {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

export function isRazorpayWebhookConfigured() {
  return Boolean(env.RAZORPAY_WEBHOOK_SECRET && env.SUPABASE_SERVICE_ROLE_KEY);
}
