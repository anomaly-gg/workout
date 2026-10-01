/* Workout sync — a dumb versioned document store. Merging happens on the devices.
   POST /v1/spaces          → { id }              create a sync space (id = secret sync code)
   GET  /v1/spaces/:id      → { doc, ver }        404 if unknown
   PUT  /v1/spaces/:id      { doc, ver } → { ver }  409 { doc, ver } if someone wrote first */

const ORIGINS = new Set([
  "https://anomaly-gg.github.io",
  "http://localhost:8753",
  "http://127.0.0.1:8753",
  "http://127.0.0.1:8799",   // local test server
]);
const MAX_DOC = 1_000_000;   // bytes — years of workouts fit in a fraction of this
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";   // Crockford base32: no I, L, O, U
const ID_RE = /^[0-9A-HJKMNP-TV-Z]{20}$/;

function cors(req) {
  const o = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": ORIGINS.has(o) ? o : "https://anomaly-gg.github.io",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
const json = (req, body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(req) } });

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return [...bytes].map(b => ALPHABET[b & 31]).join("");   // 20 chars × 5 bits = 100 bits
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
    const url = new URL(req.url);
    const now = Date.now();

    if (url.pathname === "/v1/spaces" && req.method === "POST") {
      const id = newId();
      await env.DB.prepare("INSERT INTO spaces (id, doc, ver, created, updated) VALUES (?, '{}', 0, ?, ?)").bind(id, now, now).run();
      return json(req, { id }, 201);
    }

    const m = url.pathname.match(/^\/v1\/spaces\/([^/]+)$/);
    if (!m) return json(req, { error: "not found" }, 404);
    const id = m[1].toUpperCase();
    if (!ID_RE.test(id)) return json(req, { error: "bad sync code" }, 400);

    if (req.method === "GET") {
      const row = await env.DB.prepare("SELECT doc, ver FROM spaces WHERE id = ?").bind(id).first();
      if (!row) return json(req, { error: "unknown sync code" }, 404);
      return json(req, { doc: JSON.parse(row.doc), ver: row.ver });
    }

    if (req.method === "PUT") {
      const text = await req.text();
      if (text.length > MAX_DOC) return json(req, { error: "too large" }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json(req, { error: "bad json" }, 400); }
      if (!body || typeof body.doc !== "object" || !Number.isInteger(body.ver)) return json(req, { error: "bad body" }, 400);
      const res = await env.DB.prepare("UPDATE spaces SET doc = ?, ver = ver + 1, updated = ? WHERE id = ? AND ver = ?")
        .bind(JSON.stringify(body.doc), now, id, body.ver).run();
      if (res.meta.changes === 1) return json(req, { ver: body.ver + 1 });
      const row = await env.DB.prepare("SELECT doc, ver FROM spaces WHERE id = ?").bind(id).first();
      if (!row) return json(req, { error: "unknown sync code" }, 404);
      return json(req, { doc: JSON.parse(row.doc), ver: row.ver }, 409);
    }

    return json(req, { error: "method not allowed" }, 405);
  },
};
