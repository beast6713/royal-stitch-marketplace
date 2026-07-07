import { describe, expect, it } from "vitest";
import { getUserDisplayName, getUserPrimaryEmail } from "@/lib/auth";

describe("auth helpers", () => {
  it("prefers full name when available", () => {
    expect(
      getUserDisplayName({
        firstName: "Nilesh",
        lastName: "Pandey",
        username: "np",
        primaryEmailAddress: {
          emailAddress: "nilesh@example.com"
        }
      })
    ).toBe("Nilesh Pandey");
  });

  it("falls back to email prefix when no name exists", () => {
    expect(
      getUserDisplayName({
        primaryEmailAddress: {
          emailAddress: "maker@example.com"
        }
      })
    ).toBe("maker");
    expect(
      getUserPrimaryEmail({
        primaryEmailAddress: {
          emailAddress: "maker@example.com"
        }
      })
    ).toBe("maker@example.com");
  });
});
