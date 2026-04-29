import { describe, expect, it } from "vitest";
import { containsPII, stripPII } from "../../src/domain/pii.js";

describe("pii", () => {
  it("strips emails and phone-like numbers", () => {
    const cleaned = stripPII("Email me at a@b.com or +52 1 998 345 1651");
    expect(cleaned).toBe("Email me at [email] or [phone]");
    expect(containsPII(cleaned)).toBe(false);
  });
});
