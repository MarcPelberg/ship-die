import { afterEach, describe, expect, it, vi } from "vitest";

function stubRequiredEnv() {
  vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/db");
  vi.stubEnv("PORT", "3001");
  vi.stubEnv("PUBLIC_BASE_URL", "http://localhost:3001");
  vi.stubEnv("ADMIN_TOKEN", "secret-token");
  vi.stubEnv("DEEPSEEK_API_KEY", "ds-key");
  vi.stubEnv("DEEPSEEK_MODEL", "deepseek-v4-flash");
  vi.stubEnv("DEEPSEEK_STRONG_MODEL", "deepseek-v4-pro");
  vi.stubEnv("WHATSAPP_GROUP_JID", "123@g.us");
  vi.stubEnv("WHATSAPP_AUTH_DIR", ".data/wa-auth");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("parseEnv", () => {
  it("parses required runtime configuration", async () => {
    stubRequiredEnv();

    const { parseEnv } = await import("../../src/config/env.js");

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

  it("rejects a missing database url", async () => {
    stubRequiredEnv();

    const { parseEnv } = await import("../../src/config/env.js");

    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejects a missing admin token when database url is present", async () => {
    stubRequiredEnv();

    const { parseEnv } = await import("../../src/config/env.js");

    expect(() =>
      parseEnv({
        DATABASE_URL: "postgres://user:pass@localhost:5432/db"
      })
    ).toThrow(/ADMIN_TOKEN/);
  });

  it("exports env parsed from process.env", async () => {
    stubRequiredEnv();

    const { env } = await import("../../src/config/env.js");

    expect(env).toMatchObject({
      databaseUrl: "postgres://user:pass@localhost:5432/db",
      port: 3001,
      publicBaseUrl: "http://localhost:3001",
      adminToken: "secret-token",
      deepseekApiKey: "ds-key",
      deepseekModel: "deepseek-v4-flash",
      deepseekStrongModel: "deepseek-v4-pro",
      whatsappGroupJid: "123@g.us",
      whatsappAuthDir: ".data/wa-auth"
    });
  });
});
