import { describe, expect, it } from "vitest";
import { isNoiseMessage } from "../../src/domain/noise.js";

describe("noise detection", () => {
  it("rejects admin chatter and acknowledgments", () => {
    expect(isNoiseMessage("You changed the group description. Click to view.")).toBe(true);
    expect(isNoiseMessage("Thank you")).toBe(true);
    expect(isNoiseMessage("https://github.com/gastownhall/beads")).toBe(false);
  });

  it("keeps click to view messages that contain links", () => {
    expect(isNoiseMessage("click to view https://github.com/gastownhall/beads")).toBe(false);
    expect(isNoiseMessage("You changed the group description. Click to view.")).toBe(true);
  });
});
