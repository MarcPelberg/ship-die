import { describe, expect, it } from "vitest";
import { parseEnv } from "../../src/config/env.js";

describe("parseEnv", () => {
  it("parses required runtime configuration", () => {
    const env = parseEnv({
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      PORT: "3001",
      PUBLIC_BASE_URL: "http://localhost:3001",
      ADMIN_TOKEN: "secret-token",
      DEEPSEEK_API_KEY: "ds-key",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      DEEPSEEK_STRONG_MODEL: "deepseek-v4-pro",
      WHATSAPP_GROUP_JID: "123@g.us",
      WHATSAPP_AUTH_DIR: ".data/wa-auth"
    });

    expect(env.port).toBe(3001);
    expect(env.deepseekModel).toBe("deepseek-v4-flash");
    expect(env.whatsappGroupJid).toBe("123@g.us");
  });

  it("rejects a missing database url", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });
});
