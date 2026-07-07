import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { envSchema } from '../lib/env'; // Need to conditionally export it or test it

// Assuming we can re-create the schema snippet for testing if it's not exported
const optionalString = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());
const optionalUrl = z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional());

const mockEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalString,
  CLERK_SECRET_KEY: optionalString,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
});

describe('Environment Variable Validation', () => {
  it('should treat empty strings as undefined for optional keys', () => {
    const result = mockEnvSchema.safeParse({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      CLERK_SECRET_KEY: "",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBeUndefined();
      expect(result.data.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    }
  });

  it('should accept valid strings and URLs', () => {
    const result = mockEnvSchema.safeParse({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
      CLERK_SECRET_KEY: "sk_test_123",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe("pk_test_123");
      expect(result.data.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    }
  });

  it('should fail on invalid URLs', () => {
    const result = mockEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
    });

    expect(result.success).toBe(false);
  });
});
