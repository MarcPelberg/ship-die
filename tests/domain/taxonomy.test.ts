import { describe, expect, it } from "vitest";
import { normalizeCanonicalType } from "../../src/domain/taxonomy.js";

describe("taxonomy", () => {
  it("normalizes known canonical types and falls back to tool", () => {
    expect(normalizeCanonicalType("skill/workflow pack")).toBe("skill/workflow pack");
    expect(normalizeCanonicalType("framework")).toBe("tool");
  });
});
