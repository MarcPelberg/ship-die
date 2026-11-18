import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../../src/db/client.js", () => ({ createDb: () => ({ query }) }));

describe("group join requests", () => {
  let app: typeof import("../../src/web/server.js").app;
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
    vi.stubEnv("ADMIN_TOKEN", "test-token");
    ({ app } = await import("../../src/web/server.js"));
  });
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue({ rowCount: 1 });
  });
  const fields = { name: "Test Builder", phone: "+1 (202) 555-0146", background: "I build small software tools." };
  function submit(data: Record<string, string> = fields, headers: Record<string, string> = {}) {
    return app.request("/join", { method: "POST", body: new URLSearchParams(data), headers });
  }

  it("shows a private POST form, canonicalizes the number and redirects to a refresh-safe receipt", async () => {
    const form = await app.request("/join");
    expect(form.status).toBe(200);
    expect(await form.text()).toMatch(/action="\/join" method="post"/);
    for (const phone of [fields.phone, "+12025550146"]) {
      const res = await submit({ ...fields, phone });
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe("/join/received");
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
    for (const [sql, params] of query.mock.calls) {
      expect(sql).toMatch(/insert into group_join_requests[\s\S]+on conflict \(whatsapp_phone\) do nothing/);
      expect(params).toEqual([fields.name, "+12025550146", fields.background]);
    }
    expect(query).toHaveBeenCalledTimes(2);
    const receipt = await app.request("/join/received");
    expect(receipt.status).toBe(200);
    expect(await receipt.text()).not.toContain(fields.name);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("shows field-specific validation and escapes retained input without any writes", async () => {
    const response = await submit({ name: "", phone: "202-555-0146", background: "<tag>" });
    const body = await response.text();
    expect(response.status).toBe(400);
    for (const field of ["name", "phone", "background"]) expect(body).toContain(`id="${field}-error"`);
    expect(body).toContain("&lt;tag&gt;");
    expect(body).not.toContain("<tag>");
    expect((await submit({ ...fields, name: "N".repeat(101) })).status).toBe(400);
    expect((await submit({ ...fields, background: "🥚".repeat(5) })).status).toBe(400);
    expect((await submit({ ...fields, background: "B".repeat(1001) })).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("drops honeypot submissions and rejects oversized and cross-site posts", async () => {
    expect((await submit({ ...fields, website: "filler" })).status).toBe(303);
    expect((await submit(fields, { "sec-fetch-site": "cross-site" })).status).toBe(400);
    const oversized = "b".repeat(17000);
    expect((await submit({ background: oversized }, { "content-length": "17011" })).status).toBe(413);
    expect(query).not.toHaveBeenCalled();
  });

  it("limits repeated submissions at the trusted proxy without storing the client address", async () => {
    const headers = { "x-real-ip": "192.0.2.9" };
    for (let n = 0; n < 5; n++) expect((await submit(fields, headers)).status).toBe(303);
    const limited = await submit(fields, headers);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(query).toHaveBeenCalledTimes(5);
    expect(JSON.stringify(query.mock.calls)).not.toContain(headers["x-real-ip"]);
  });

  it("keeps a failed application editable and returns 503 without exposing database details", async () => {
    query.mockRejectedValueOnce(new Error("private database detail"));
    const res = await submit();
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("retry-after")).toBe("60");
    const html = await res.text();
    expect(html).toContain(fields.name);
    expect(html).not.toContain("private database detail");
    expect((await submit()).status).toBe(303);
  });
});
