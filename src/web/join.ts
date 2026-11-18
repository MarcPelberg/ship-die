import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { isIP } from "node:net";
import type { Db } from "../db/client.js";
import { renderJoin } from "./render.js";

export function joinRoutes(db: Pick<Db, "query">) {
  const routes = new Hono();
  const attempts = new Map<string, number>();
  const windowMs = 10 * 60 * 1000;
  let windowEnds = Date.now() + windowMs;

  routes.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("Referrer-Policy", "no-referrer");
    await next();
  });
  routes.get("/", c => c.html(renderJoin()));
  routes.get("/received", c => {
    c.header("X-Robots-Tag", "noindex");
    return c.html(renderJoin({ success: true }));
  });

  routes.post("/", bodyLimit({
    maxSize: 16 * 1024,
    onError: c => c.html(renderJoin({ message: "This request is too long. Shorten your answers and try again." }), 413)
  }), async c => {
    const type = c.req.header("content-type")?.split(";")[0].trim().toLowerCase();
    if (type !== "application/x-www-form-urlencoded" || c.req.header("sec-fetch-site") === "cross-site") {
      return c.html(renderJoin({ message: "Please use this form to send your request." }), 400);
    }
    const form = new URLSearchParams(await c.req.text());
    if (form.get("website")) return c.redirect("/join/received", 303);

    const values = {
      name: (form.get("name") ?? "").trim(),
      phone: (form.get("phone") ?? "").trim(),
      background: (form.get("background") ?? "").trim()
    };
    const errors: Partial<Record<keyof typeof values, string>> = {};
    if (!values.name || values.name.length > 100 || /[\x00-\x1f\x7f]/.test(values.name)) {
      errors.name = "Enter a name of up to 100 characters.";
    }
    const phone = values.phone.replace(/[ ().-]/g, "");
    if (!/^\+[1-9]\d{6,14}$/.test(phone) || !values.phone.startsWith("+")) {
      errors.phone = "Include + and the country code, followed by the WhatsApp number.";
    }
    if ([...values.background].length < 10 || values.background.length > 1000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(values.background)) {
      errors.background = "Write between 10 and 1,000 characters about your background.";
    }
    if (Object.keys(errors).length) return c.html(renderJoin({ values, errors }), 400);

    // Production nginx overwrites X-Real-IP. Keep this best-effort limit in memory only.
    const ip = c.req.header("x-real-ip");
    if (ip && isIP(ip)) {
      const now = Date.now();
      if (now >= windowEnds) {
        attempts.clear();
        windowEnds = now + windowMs;
      }
      const used = attempts.get(ip) ?? 0;
      if (used >= 5) {
        c.header("Retry-After", String(Math.ceil((windowEnds - now) / 1000)));
        return c.html(renderJoin({ values, message: "Several requests have been sent. Please try again in ten minutes." }), 429);
      }
      if (used || attempts.size < 8192) attempts.set(ip, used + 1);
    }

    const attemptWindow = windowEnds;
    try {
      await db.query(
        `insert into group_join_requests (name, whatsapp_phone, background)
         values ($1, $2, $3) on conflict (whatsapp_phone) do nothing`,
        [values.name, phone, values.background]
      );
    } catch {
      if (ip && attemptWindow === windowEnds && attempts.has(ip)) {
        attempts.set(ip, Math.max(0, attempts.get(ip)! - 1));
      }
      c.header("Retry-After", "60");
      return c.html(renderJoin({ values, message: "We couldn’t save your request. Please try again in a minute." }), 503);
    }
    return c.redirect("/join/received", 303);
  });
  return routes;
}
