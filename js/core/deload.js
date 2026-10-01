/* Deload weeks: a lighter week (fewer sets, further from failure) — not a week off.
   settings.deload = { active: { start, end } | null, last: ts, snooze: ts }   (synced across devices)
   Evidence: coaches typically deload for 5–7 days every 4–6 weeks (Bell 2022); consensus is to cut sets/reps
   and keep training frequency (Bell 2023); a full week off didn't help hypertrophy and slightly hurt
   lower-body strength (Coleman 2024). */
const DELOAD_AFTER_WEEKS = 6;
const DELOAD_DAYS = 7;

const deloadState = () => settings.deload || { active: null, last: 0, snooze: 0 };
const deloadActive = () => { const a = deloadState().active; return !!a && Date.now() < a.end; };

/* Distinct calendar weeks with at least one (non-deload) session since `since`. */
function trainedWeeksSince(since) {
  return new Set(history.filter(h => h.started >= since && !h.deload).map(h => startOfWeek(h.started))).size;
}

function deloadDue() {
  const d = deloadState();
  if (deloadActive() || !history.length || Date.now() < (d.snooze || 0)) return false;
  return trainedWeeksSince(d.last || 0) >= DELOAD_AFTER_WEEKS;
}

function startDeload() {
  const now = Date.now();
  settings.deload = { ...deloadState(), active: { start: now, end: now + DELOAD_DAYS * DAY } };
  saveSettings();
}
function endDeload() {
  settings.deload = { ...deloadState(), active: null, last: Date.now() };
  saveSettings();
}
function snoozeDeload() {
  settings.deload = { ...deloadState(), snooze: Date.now() + 7 * DAY };
  saveSettings();
}
/* A finished deload week closes itself on the next launch. */
function settleDeload() {
  const a = deloadState().active;
  if (a && Date.now() >= a.end) { settings.deload = { ...deloadState(), active: null, last: a.end }; saveSettings(); }
}

const deloadDay = () => Math.min(DELOAD_DAYS, Math.floor((Date.now() - deloadState().active.start) / DAY) + 1);
/* About a third fewer sets: 3 → 2, 2 → 1. */
const deloadSets = sets => Math.max(1, sets - 1);
