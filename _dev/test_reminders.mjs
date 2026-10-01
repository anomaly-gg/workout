/* Reminder scheduling logic with a fake D1 + fake push service. Run: node _dev/test_reminders.mjs */
import { webcrypto } from "node:crypto";
import { runReminders } from "../worker/src/push.js";

let fails = 0;
const check = (ok, msg) => { console.log((ok ? "ok   " : "FAIL ") + msg); if (!ok) fails++; };

// Real ES256 key so VAPID signing actually runs.
const kp = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const jwk = await webcrypto.subtle.exportKey("jwk", kp.privateKey);
const rawPub = Buffer.from(await webcrypto.subtle.exportKey("raw", kp.publicKey)).toString("base64url");

function fakeEnv(subs, spaces = {}) {
  const prep = sql => ({
    _args: [], bind(...a) { this._args = a; return this; },
    async all() { return { results: subs.map(s => ({ ...s })) }; },
    async first() { return spaces[this._args[0]] ? { doc: JSON.stringify(spaces[this._args[0]]) } : null; },
    async run() {
      if (sql.startsWith("UPDATE push_subs SET last_sent")) subs.find(s => s.endpoint === this._args[1]).last_sent = this._args[0];
      if (sql.startsWith("DELETE FROM push_subs")) subs.splice(subs.findIndex(s => s.endpoint === this._args[0]), 1);
      return {};
    },
  });
  return { DB: { prepare: prep }, VAPID_PRIVATE_JWK: JSON.stringify(jwk), VAPID_PUBLIC: rawPub, VAPID_SUBJECT: "https://anomaly-gg.github.io/workout/" };
}

const sent = [];
let pushStatus = 201, lastAuth = "";
globalThis.fetch = async (url, opts) => { sent.push(url); lastAuth = opts.headers.Authorization; return { status: pushStatus }; };
const RealDate = Date;
function at(iso) { const t = new RealDate(iso).getTime(); globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [t])); } static now() { return t; } }; }

// Wed 2026-10-07 18:05 in Manila = 10:05 UTC.  Mon=0 … Wed=2.
const sub = (o) => ({ endpoint: "https://push.example/" + o.id, days: "0,2,4", minute: 18 * 60, tz: "Asia/Manila", sync_id: null, last_sent: null, created: 0, ...o });

at("2026-10-07T10:05:00Z");
let subs = [sub({ id: "due" }), sub({ id: "notToday", days: "1,3" }), sub({ id: "tooEarly", minute: 19 * 60 }), sub({ id: "otherTz", tz: "Europe/London" })];
await runReminders(fakeEnv(subs));
check(JSON.stringify(sent) === '["https://push.example/due"]', "only the due Manila device is pushed (day, time and timezone respected)");
check(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/.test(lastAuth), "VAPID authorization header is a signed JWT");

sent.length = 0; at("2026-10-07T10:10:00Z");
await runReminders(fakeEnv(subs));
check(sent.length === 0, "no second reminder on the same day");

sent.length = 0; at("2026-10-07T10:45:00Z");
subs = [sub({ id: "late" })];
await runReminders(fakeEnv(subs));
check(sent.length === 0, "nothing sent once the 30-minute window has passed");

sent.length = 0; at("2026-10-07T10:05:00Z");
const today = new RealDate("2026-10-07T02:00:00Z").getTime();   // 10:00 Manila, same day
subs = [sub({ id: "trained", sync_id: "SPACE" })];
await runReminders(fakeEnv(subs, { SPACE: { history: [{ started: today }] } }));
check(sent.length === 0 && subs[0].last_sent === "2026-10-07", "skipped (and marked) when a workout is already synced today");

sent.length = 0; pushStatus = 410;
subs = [sub({ id: "gone" })];
await runReminders(fakeEnv(subs));
check(sent.length === 1 && subs.length === 0, "expired subscription (410) is deleted");

console.log(fails ? `${fails} FAILURES` : "ALL REMINDER CHECKS PASS");
process.exit(fails ? 1 : 0);
