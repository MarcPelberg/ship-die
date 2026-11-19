import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Hono } from "hono";

const origin = "https://marcpelberg.com";
const modules = new Map([["/bravos/directory.js", "?v=3"], ["/bravos/crypto.js", "?v=2"]]);
const packet = /^\/bravos\/data\/(?:index\.bin|[0-9a-f]{32}\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.bin)$/;
const assets = new Map([
  ["/bravos", ["bravos.html", "text/html; charset=utf-8"]],
  ["/bravos/", ["bravos.html", "text/html; charset=utf-8"]],
  ["/bravos/guide.css", ["bravos.css", "text/css; charset=utf-8"]],
  ["/bravos/crest.webp", ["bravos-crest.webp", "image/webp"]]
]);
const policy = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export const bravosRoutes = new Hono();
bravosRoutes.on("GET", ["/bravos", "/bravos/*"], async c => {
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "no-store");
  const url = new URL(c.req.url);
  const local = assets.get(url.pathname);
  if (local) {
    const [file, type] = local;
    c.header("Content-Security-Policy", policy);
    return c.body(new Uint8Array(await readFile(resolve("src/web/assets", file))), 200, { "Content-Type": type });
  }

  // Only these two modules and the packager's exact ciphertext names exist upstream.
  // Never copy request headers, URL query strings or redirects across origins.
  const script = modules.has(url.pathname);
  if (!script && !packet.test(url.pathname)) return c.notFound();
  const type = script ? "application/javascript" : "application/octet-stream";
  try {
    const response = await fetch(origin + url.pathname + (modules.get(url.pathname) ?? ""), {
      redirect: "error", credentials: "omit",
      signal: AbortSignal.any([c.req.raw.signal, AbortSignal.timeout(45000)])
    });
    const mime = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    const validType = mime === type || (script && mime === "text/javascript");
    if (response.status !== 200 || !validType || !response.body) {
      await response.body?.cancel();
      return response.status === 404 ? c.notFound() : c.text("Directorio no disponible", 502);
    }
    return c.body(response.body, 200, { "Content-Type": type });
  } catch {
    return c.text("Directorio no disponible", 502);
  }
});
