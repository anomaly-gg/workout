/* Plan generator + plan lookups. Builds PLAN (A/B) from SLOTS for the chosen equipment.
   Exercise shape: { key, cat, type, sets, lo, hi, rest, levels:[names], needs:[need|null], workout }
   Levels are stored as an index into the FULL ladder, so changing equipment never shifts anyone's rung. */

const has = (equip, need) => !need || need.split("|").some(n => equip.includes(n));

function buildPlan(equip, sets = settings.sets) {
  const used = new Set(), gaps = [], plan = {};
  ["A", "B"].forEach(w => {
    plan[w] = { name: "Workout " + w, exercises: [] };
    SLOTS[w].forEach(slot => {
      const opt = slot.options.find(o => !used.has(o.key) && has(equip, o.needs));
      if (!opt) { gaps.push(`Nothing in your kit covers ${slot.cat} — Workout ${w} skips it.`); return; }
      used.add(opt.key);
      if (GAP_NOTES[opt.key]) gaps.push(GAP_NOTES[opt.key]);
      plan[w].exercises.push({
        key: opt.key, cat: slot.cat, workout: w,
        type: opt.type || slot.type, sets: sets || opt.sets || slot.sets,
        lo: opt.lo || slot.lo, hi: opt.hi || slot.hi, rest: opt.rest || slot.rest,
        levels: opt.levels.map(l => Array.isArray(l) ? l[0] : l),
        needs: opt.levels.map(l => Array.isArray(l) ? l[1] : null),
      });
    });
  });
  if (!equip.includes("chair")) gaps.push("No sturdy furniture: a few harder rungs (decline push-ups, Bulgarian split squats, Nordic curls) are skipped.");
  return { plan, gaps: [...new Set(gaps)] };
}

let PLAN, PLAN_GAPS, ALL_EX;
function applyEquipment() {
  ({ plan: PLAN, gaps: PLAN_GAPS } = buildPlan(settings.equipment));
  ALL_EX = [...PLAN.A.exercises, ...PLAN.B.exercises];
}
applyEquipment();

/* ---- Lookups ---- */
const exDef  = key => ALL_EX.find(e => e.key === key) || null;
const maxLvl = key => { const e = exDef(key); return e ? e.levels.length - 1 : 0; };
const rungOk = (key, i) => { const e = exDef(key); return !!e && i >= 0 && i < e.levels.length && has(settings.equipment, e.needs[i]); };
/* Next doable rung from `from` in direction dir (+1/-1), or null. */
function stepRung(key, from, dir) {
  for (let i = from + dir; i >= 0 && i <= maxLvl(key); i += dir) if (rungOk(key, i)) return i;
  return null;
}
const firstRung = key => rungOk(key, 0) ? 0 : (stepRung(key, 0, 1) ?? 0);
const lvlOf    = key => clamp(levels[key] ?? firstRung(key), 0, maxLvl(key));
const nextRung = key => stepRung(key, lvlOf(key), 1);
const prevRung = key => stepRung(key, lvlOf(key), -1);
const setLevel = (key, idx) => saveLevel(key, clamp(idx, 0, maxLvl(key)));
const curName  = key => exDef(key).levels[lvlOf(key)];
const EQUIP_NAME = id => (EQUIPMENT.find(e => e.id === id) || { name: id }).name;
const needLabel = need => need.split("|").map(EQUIP_NAME).join(" or ");
