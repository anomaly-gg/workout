/* Small shared helpers — no app state here. */
const $  = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const DAY = 864e5;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmtClock = sec => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
};
const fmtMins = ms => {
  const m = Math.round(ms / 60000);
  return m >= 60 ? Math.floor(m / 60) + "h " + (m % 60) + "m" : m + " min";
};
const fmtDay  = ts => new Date(ts).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const fmtTime = ts => new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
/* Weeks start Monday. */
const startOfWeek = ts => {
  const d = new Date(startOfDay(ts));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
};
const addDays = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); };

const num = v => parseFloat(v) || 0;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
