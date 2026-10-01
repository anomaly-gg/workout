/* Bodyweight log. One entry per day, stored in kg: weights = { "YYYY-MM-DD": { kg, at } }.
   Deleting keeps a tombstone ({ kg: null, at }) so sync can't bring it back; per day the newest `at` wins.
   Daily weight swings 1–2 kg with water and food, so decisions use 7-day averages, never single readings. */
const LS_WEIGHTS = "wo_weights_v2";
let weights = load(LS_WEIGHTS, {});

const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const dayStart = key => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };

function saveWeights() { save(LS_WEIGHTS, weights); onDataChanged(); }
function logWeight(kg, ts = Date.now()) { weights[dayKey(ts)] = { kg: Math.round(kg * 100) / 100, at: Date.now() }; saveWeights(); }
function deleteWeight(key) { weights[key] = { kg: null, at: Date.now() }; saveWeights(); }

/* Live entries, oldest first: [{ key, ts, kg }] */
const weightEntries = () => Object.entries(weights)
  .filter(([, v]) => v && v.kg > 0)
  .map(([key, v]) => ({ key, ts: dayStart(key), kg: v.kg }))
  .sort((a, b) => a.ts - b.ts);

/* Mean of entries in the 7 days ending `daysAgo` days back (0 = this past week). Needs ≥3 weigh-ins. */
function weekAvg(daysAgo = 0, now = Date.now()) {
  const end = startOfDay(now) + DAY - daysAgo * DAY, start = end - 7 * DAY;
  const xs = weightEntries().filter(e => e.ts >= start && e.ts < end).map(e => e.kg);
  return xs.length >= 3 ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
}

/* The weight nutrition targets should use: recent 7-day average, else the latest entry (≤ 30 days old). */
function currentWeightKg() {
  const avg = weekAvg(0);
  if (avg) return avg;
  const last = weightEntries().pop();
  return last && Date.now() - last.ts < 30 * DAY ? last.kg : null;
}

/* Rolling 7-day average for each logged day — the line on the chart. */
function rollingAvg(entries) {
  return entries.map(e => {
    const win = entries.filter(x => x.ts > e.ts - 7 * DAY && x.ts <= e.ts);
    return win.reduce((s, x) => s + x.kg, 0) / win.length;
  });
}

/* Evidence-based weekly pace (% of bodyweight per week): Helms 2014 (fat loss 0.5–1%), Iraki 2019 (gain 0.25–0.5%). */
const PACE = {
  lose:     { lo: -1.0, hi: -0.5, slowIf: v => v > -0.25, fastIf: v => v < -1.0, slowFix: -150, fastFix: +150 },
  muscle:   { lo: 0.25, hi: 0.5,  slowIf: v => v < 0.1,   fastIf: v => v > 0.75, slowFix: +150, fastFix: -150 },
  general:  { lo: -0.25, hi: 0.25, slowIf: v => v < -0.5, fastIf: v => v > 0.5,  slowFix: +150, fastFix: -150 },
};
PACE.strength = PACE.general;

/* → null (not enough data) or { pct, status: "ok"|"slow"|"fast", fix } comparing this week's average to last week's. */
function paceCheck(goal, now = Date.now()) {
  const a = weekAvg(0, now), b = weekAvg(7, now);
  if (!a || !b) return null;
  const pct = (a - b) / b * 100, p = PACE[goal] || PACE.general;
  if (p.slowIf(pct)) return { pct, status: "slow", fix: p.slowFix };
  if (p.fastIf(pct)) return { pct, status: "fast", fix: p.fastFix };
  return { pct, status: "ok", fix: 0 };
}

/* Sync merge: per day, the newest change wins (including deletions). */
function mergeWeights(a, b) {
  const out = { ...(b || {}) };
  Object.entries(a || {}).forEach(([k, v]) => { if (!out[k] || (v && v.at > out[k].at)) out[k] = v; });
  return Object.fromEntries(Object.keys(out).sort().map(k => [k, out[k]]));
}
