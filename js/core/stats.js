/* Derived numbers: what's next, suggestions, records, streaks, rank. Pure reads of store state. */

function nextWorkout() {
  const last = history.length ? history[history.length - 1].workout : null;
  return last === "A" ? "B" : "A";
}

const doneSets = e => (e.sets || []).filter(s => s.done);
const bestOf   = e => Math.max(0, ...doneSets(e).map(s => num(s.r)));

/* Most recent logged entry for an exercise (optionally only sessions before `beforeTs`). */
function lastEntry(key, beforeTs = Infinity) {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].started >= beforeTs || history[i].deload) continue;
    const e = (history[i].entries || []).find(x => x.key === key);
    if (e && doneSets(e).length) return e;
  }
  return null;
}

/* Best single set at a given rung, across sessions before `beforeTs`. */
function bestAtLevel(key, level, beforeTs = Infinity) {
  let best = 0;
  history.forEach(h => {
    if (h.started >= beforeTs || h.deload) return;
    (h.entries || []).forEach(e => { if (e.key === key && (e.level ?? 0) === level) best = Math.max(best, bestOf(e)); });
  });
  return best;
}

/* Coaching line for an exercise: { text, tone: "up"|"new"|"push"|"own", ready, aim } */
function suggest(ex) {
  if (deloadActive()) return { text: "Deload — easy reps", tone: "own", ready: false, aim: ex.lo };
  const lv = lvlOf(ex.key), last = lastEntry(ex.key);
  if (!last) return { text: "First time — aim " + ex.lo, tone: "new", ready: false, aim: ex.lo };
  const done = doneSets(last), best = bestOf(last);
  const maxed = last.level === lv && done.length >= ex.sets && done.every(s => num(s.r) >= ex.hi);
  if (maxed && nextRung(ex.key) !== null) return { text: "Level up ready", tone: "up", ready: true, aim: ex.hi };
  if (last.level < lv) return { text: "New rung — aim " + ex.lo, tone: "new", ready: false, aim: ex.lo };
  if (last.level > lv) return { text: "Rebuild — aim " + ex.lo, tone: "new", ready: false, aim: ex.lo };
  if (maxed) return { text: "Top rung maxed. Own it.", tone: "own", ready: false, aim: ex.hi };
  if (best >= ex.hi) return { text: `${ex.hi} on every set`, tone: "push", ready: false, aim: ex.hi };
  const aim = clamp(best + 1, ex.lo, ex.hi);
  return { text: "Beat " + best + " → " + aim, tone: "push", ready: false, aim };
}
const readyToLevel = () => deloadActive() ? [] : ALL_EX.filter(e => suggest(e).ready);

/* ---- Session totals ---- */
const sessionReps  = h => (h.entries || []).reduce((s, e) => e.type === "timed" ? s : s + doneSets(e).reduce((a, st) => a + num(st.r), 0), 0);
const sessionHold  = h => (h.entries || []).reduce((s, e) => e.type !== "timed" ? s : s + doneSets(e).reduce((a, st) => a + num(st.r), 0), 0);
const sessionSets  = h => (h.entries || []).reduce((s, e) => s + doneSets(e).length, 0);
const sessionMs    = h => h.ended ? h.ended - h.started : 0;

function estMinutes(w) {
  const secs = PLAN[w].exercises.reduce((s, e) => s + (deloadActive() ? deloadSets(e.sets) : e.sets) * (40 + e.rest), 0);
  return Math.round(secs / 60 / 5) * 5;
}

/* ---- Calendar / streaks ---- */
const sessionsInWeek = ts => { const w = startOfWeek(ts); return history.filter(h => startOfWeek(h.started) === w).length; };
const trainedOn = ts => { const d = startOfDay(ts); return history.some(h => startOfDay(h.started) === d); };
const daysSinceLast = () => history.length ? Math.round((startOfDay(Date.now()) - startOfDay(history[history.length - 1].started)) / DAY) : null;

/* Consecutive weeks hitting the goal. The current week only counts once it's hit,
   but an unfinished current week doesn't break the streak. */
function weekStreak() {
  const goal = settings.weeklyGoal;
  const counts = {};
  history.forEach(h => { const w = startOfWeek(h.started); counts[w] = (counts[w] || 0) + 1; });
  let w = startOfWeek(Date.now()), cur = 0;
  if ((counts[w] || 0) >= goal) cur++;
  w = addDays(w, -7);
  while ((counts[w] || 0) >= goal) { cur++; w = addDays(w, -7); }

  let best = 0, run = 0;
  if (history.length) {
    for (let x = startOfWeek(history[0].started); x <= startOfWeek(Date.now()); x = addDays(x, 7)) {
      run = (counts[x] || 0) >= goal ? run + 1 : 0;
      best = Math.max(best, run);
    }
  }
  return { current: cur, best };
}

/* ---- Rank: earned by rungs climbed across all ladders ---- */
const RANKS = [
  [0, "Rookie"], [5, "Novice"], [12, "Trained"], [20, "Athlete"],
  [30, "Advanced"], [40, "Elite"], [50, "Master"],
];
function rank() {
  const rungs = ALL_EX.reduce((s, e) => s + lvlOf(e.key), 0);
  const total = ALL_EX.reduce((s, e) => s + e.levels.length - 1, 0);
  let i = 0; while (i + 1 < RANKS.length && rungs >= RANKS[i + 1][0]) i++;
  const from = RANKS[i][0], to = RANKS[i + 1] ? RANKS[i + 1][0] : total;
  return {
    level: rungs + 1, title: RANKS[i][1], rungs, total,
    next: RANKS[i + 1] ? RANKS[i + 1][1] : null,
    toNext: to - rungs,
    pct: to > from ? (rungs - from) / (to - from) : 1,
  };
}
