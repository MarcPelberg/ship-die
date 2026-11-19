import { afterEach, describe, expect, it, vi } from "vitest";
import { bravosRoutes } from "../../src/web/bravos.js";

const documentPath = "/bravos/data/00112233445566778899aabbccddeeff/00000000-0000-4000-8000-000000000001.bin";

describe("BRAVOS directory assets", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ["/bravos/guide.css", "text/css"],
    ["/bravos/crest.webp", "image/webp"]
  ])("serves the local event artwork and styles at %s", async (path, type) => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const response = await bravosRoutes.request(path);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain(type);
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(100);
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each(["directory", "crypto"])("fetches the fixed canonical %s module without forwarding visitor information", async name => {
    const upstream = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("export {};", {
      headers: { "Content-Type": "application/javascript; charset=UTF-8", "Set-Cookie": "ignored=1", "X-Origin": "private" }
    }));
    const response = await bravosRoutes.request("/bravos/" + name + ".js?v=2&extra=value", {
      headers: { Authorization: "Bearer visitor", Cookie: "client=visitor" }
    });
    const [url, options] = upstream.mock.calls[0];
    expect(url).toBe("https://marcpelberg.com/bravos/" + name + ".js?v=2");
    expect(options).toMatchObject({ credentials: "omit", redirect: "error" });
    expect(options?.headers).toBeUndefined();
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(response.headers.has("x-origin")).toBe(false);
    expect(response.headers.get("Content-Type")).toBe("application/javascript");
    expect(await response.text()).toBe("export {};");
  });

  it.each(["/bravos/data/index.bin", documentPath])("streams the encrypted bytes at %s", async path => {
    const bytes = Uint8Array.of(0, 255, 250, 33);
    const upstream = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(bytes, {
      headers: { "Content-Type": "application/octet-stream" }
    }));
    const response = await bravosRoutes.request(path);
    expect(upstream.mock.calls[0][0]).toBe("https://marcpelberg.com" + path);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });

  it.each(["/bravos/backup.js", "/bravos/data/notes.pdf", "/bravos/data/INDEX.bin", "/bravos/data/%69ndex.bin",
    "/bravos/data/a/b.bin", documentPath + "/extra"])("rejects unlisted asset paths without a fetch: %s", async path => {
    const upstream = vi.spyOn(globalThis, "fetch");
    expect((await bravosRoutes.request(path)).status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects non-read methods without transmitting credentials", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const response = await bravosRoutes.request("/bravos", { method: "POST", body: "sample" });
    expect(response.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("handles absent, unavailable and mistyped upstream assets", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(new Response("<html></html>", { headers: { "Content-Type": "text/html" } }))
      .mockRejectedValueOnce(new Error("upstream unavailable"));
    const path = "/bravos/data/index.bin";
    expect((await bravosRoutes.request(path)).status).toBe(404);
    expect((await bravosRoutes.request(path)).status).toBe(502);
    const failed = await bravosRoutes.request(path);
    expect(failed.status).toBe(502);
    expect(await failed.text()).toBe("Directorio no disponible");
  });
});
