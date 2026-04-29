import { describe, expect, it } from "vitest";
import { isNoiseMessage } from "../../src/domain/noise.js";

describe("noise detection", () => {
  it("rejects admin chatter and acknowledgments", () => {
    expect(isNoiseMessage("You changed the group description. Click to view.")).toBe(true);
    expect(isNoiseMessage("Thank you")).toBe(true);
    expect(isNoiseMessage("https://github.com/gastownhall/beads")).toBe(false);
  });
});
