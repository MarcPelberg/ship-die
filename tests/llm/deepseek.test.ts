import { describe, expect, it } from "vitest";
import { DeepSeekProvider, parseDeepSeekCardDraft } from "../../src/llm/deepseek.js";

const validDraft = {
  title: "Claude Octopus",
  summary: "Multi-model review for coding tasks.",
  canonicalType: "review/eval",
  tags: ["Debugging", "multi-model", "debugging"],
  sourceUrl: "https://github.com/nyldn/claude-octopus",
  sourceNote: "github repo",
  confidence: 0.91,
  shouldPublish: true
};

describe("parseDeepSeekCardDraft", () => {
  it("normalizes canonical type and tags", () => {
    const draft = parseDeepSeekCardDraft(JSON.stringify(validDraft));

    expect(draft.canonicalType).toBe("review/eval");
    expect(draft.tags).toEqual(["debugging", "multi-model"]);
    expect(draft.shouldPublish).toBe(true);
  });

  it("throws for unknown canonical type", () => {
    expect(() =>
      parseDeepSeekCardDraft(
        JSON.stringify({
          ...validDraft,
          canonicalType: "library"
        })
      )
    ).toThrow(/canonicalType/);
  });

  it("throws for invalid source URL", () => {
    expect(() =>
      parseDeepSeekCardDraft(
        JSON.stringify({
          ...validDraft,
          sourceUrl: "ftp://example.com/repo"
        })
      )
    ).toThrow(/sourceUrl/);
  });
});

describe("DeepSeekProvider", () => {
  it("sends only cleaned text and links to DeepSeek", async () => {
    const calls: unknown[] = [];
    const provider = new DeepSeekProvider({ apiKey: "test-key", model: "deepseek-chat" });
    const fakeClient = {
      chat: {
        completions: {
          create: async (payload: unknown) => {
            calls.push(payload);
            return {
              choices: [{ message: { content: JSON.stringify(validDraft) } }]
            };
          }
        }
      }
    };

    Object.defineProperty(provider, "client", { value: fakeClient });

    await provider.generateCard({
      message: {
        externalId: "msg-1",
        groupId: "group-1",
        senderId: "sender-1",
        occurredAt: new Date("2026-04-29T00:00:00.000Z"),
        text: "original private text",
        raw: { private: true }
      },
      cleanedText: "sanitized builder note",
      links: [
        {
          url: "https://example.com/tool",
          canonicalUrl: "https://example.com/tool",
          title: "Example Tool"
        }
      ]
    });

    const payload = calls[0] as { messages: Array<{ role: string; content: string }> };
    const userMessage = payload.messages.find((message) => message.role === "user");

    expect(JSON.parse(userMessage?.content ?? "")).toEqual({
      cleanedText: "sanitized builder note",
      links: [
        {
          url: "https://example.com/tool",
          canonicalUrl: "https://example.com/tool",
          title: "Example Tool"
        }
      ]
    });
  });
});
