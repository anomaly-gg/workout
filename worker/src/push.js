/* Training-day reminders: Web Push without a payload (so no message encryption is needed — the app's
   service worker builds the notification text itself). VAPID-signed with the key in the
   VAPID_PRIVATE_JWK secret. The cron runs every 5 minutes and sends to whoever is due. */

const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlJson = obj => b64url(new TextEncoder().encode(JSON.stringify(obj)));

let signingKey = null;
async function vapidAuth(env, endpoint) {
  signingKey ??= await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVATE_JWK), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const unsigned = b64urlJson({ typ: "JWT", alg: "ES256" }) + "." +
    b64urlJson({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT });
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, new TextEncoder().encode(unsigned));
  return `vapid t=${unsigned}.${b64url(sig)}, k=${env.VAPID_PUBLIC}`;
}

/* → HTTP status from the push service (201 = delivered to the push service). */
export async function sendPush(env, endpoint) {
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: await vapidAuth(env, endpoint), TTL: "3600", Urgency: "normal", "Content-Length": "0" },
  });
  return r.status;
}

/* Local weekday (0 = Monday) / minute-of-day / date for a timezone. */
function localNow(tz, now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map(x => [x.type, x.value]));
  return { day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday), minute: +p.hour * 60 + +p.minute, date: `${p.year}-${p.month}-${p.day}` };
}
const localDate = (ts, tz) => localNow(tz, new Date(ts)).date;

/* If the device syncs, skip the reminder when a workout is already logged today. */
async function trainedToday(env, syncId, tz, today) {
  if (!syncId) return false;
  const row = await env.DB.prepare("SELECT doc FROM spaces WHERE id = ?").bind(syncId).first();
  if (!row) return false;
  const hist = JSON.parse(row.doc).history || [];
  return hist.length > 0 && localDate(hist[hist.length - 1].started, tz) === today;
}

export async function runReminders(env) {
  const { results } = await env.DB.prepare("SELECT * FROM push_subs").all();
  for (const s of results) {
    let now;
    try { now = localNow(s.tz); } catch { continue; }
    const days = s.days.split(",").map(Number);
    const due = days.includes(now.day) && now.minute >= s.minute && now.minute < s.minute + 30 && s.last_sent !== now.date;
    if (!due) continue;
    // mark first so a slow push service can't cause a double send on the next tick
    await env.DB.prepare("UPDATE push_subs SET last_sent = ? WHERE endpoint = ?").bind(now.date, s.endpoint).run();
    if (await trainedToday(env, s.sync_id, s.tz, now.date)) continue;
    const status = await sendPush(env, s.endpoint).catch(() => 0);
    if (status === 404 || status === 410) await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(s.endpoint).run();
  }
}
