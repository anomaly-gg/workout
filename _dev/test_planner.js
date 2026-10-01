/* Dev check for the plan generator. Run: node _dev/test_planner.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const ctx = { console, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
vm.createContext(ctx);
const run = f => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
["js/data/plan.js", "js/data/cues.js", "js/data/videos.js", "js/core/util.js", "js/core/store.js", "js/core/planner.js"].forEach(run);
const T = code => vm.runInContext(code, ctx);

let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.log("FAIL:", msg); } };

// 1. Default equipment reproduces the original hand-built plan (from _backup/index.v1.html).
const old = fs.readFileSync(path.join(root, "_backup/index.v1.html"), "utf8");
const oldPlan = vm.runInNewContext("(" + old.slice(old.indexOf("const PLAN = {") + 13, old.indexOf("};", old.indexOf("const PLAN = {")) + 1) + ")");
const def = T("buildPlan(EQUIP_DEFAULT).plan");
// The one deliberate addition since the original plan: hamstring curls in Workout A, right after squats.
check(def.A.exercises[4] && def.A.exercises[4].key === "legcurl", "Workout A has the hamstring-curl slot after squats");
def.A.exercises = def.A.exercises.filter(e => e.key !== "legcurl");
["A", "B"].forEach(w => {
  check(def[w].exercises.length === oldPlan[w].exercises.length, `default ${w} exercise count`);
  oldPlan[w].exercises.forEach((o, i) => {
    const n = def[w].exercises[i] || {};
    ["key", "cat", "type", "sets", "lo", "hi", "rest"].forEach(f => check(n[f] === o[f], `default ${w}[${i}].${f}: ${n[f]} vs ${o[f]}`));
    check(JSON.stringify(n.levels) === JSON.stringify(o.levels), `default ${w}[${i}] levels identical (${o.key})`);
  });
});

// 2. Every rung of every ladder has a form cue.
const names = new Set(T("Object.values(SLOTS).flat().flatMap(s => s.options.flatMap(o => o.levels.map(l => Array.isArray(l) ? l[0] : l)))"));
names.forEach(n => check(T("CUES")[n], `missing cue: ${n}`));
const noVideo = [...names].filter(n => !T("VIDEOS")[n]);

// 3. All 64 equipment combinations: unique keys, every exercise has >= 1 doable rung, all needs are known ids.
const ids = T("EQUIPMENT.map(e => e.id)");
for (let m = 0; m < 1 << ids.length; m++) {
  const eq = ids.filter((_, i) => m & (1 << i));
  const { plan, gaps } = T(`buildPlan(${JSON.stringify(eq)})`);
  const all = [...plan.A.exercises, ...plan.B.exercises];
  check(new Set(all.map(e => e.key)).size === all.length, `duplicate keys for [${eq}]`);
  all.forEach(e => {
    check(e.needs.some(nd => !nd || nd.split("|").some(x => eq.includes(x))), `no doable rung: ${e.key} with [${eq}]`);
    e.needs.forEach(nd => nd && nd.split("|").forEach(x => check(ids.includes(x), `unknown need ${x}`)));
  });
  if (all.length < 12) check(gaps.some(g => g.startsWith("Nothing in your kit")), `missing slot not reported for [${eq}]`);
}

// 4. Rung stepping skips unavailable rungs and never loses the stored index.
T(`settings.equipment = ["bar", "dips", "chair"]; applyEquipment(); levels = { pullup: 0 };`);
check(T(`nextRung("pullup")`) === 2, "pull-up negatives → skips band-assisted → pull-ups");
T(`levels = { pullup: 2 };`);
check(T(`prevRung("pullup")`) === 0, "pull-ups ↓ skips band-assisted");
T(`settings.equipment = ["bar", "dips", "chair", "band"]; applyEquipment();`);
check(T(`nextRung("pullup")`) === 3 && T(`prevRung("pullup")`) === 1, "with bands, band-assisted rung is back");
T(`settings.equipment = []; applyEquipment(); levels = {};`);
check(T(`lvlOf("pushup")`) === 0 && T(`exDef("pullup")`) === null, "bodyweight-only plan has no pull-up ladder");

// 5. Nutrition maths (Mifflin–St Jeor) + guardrails, and placement → starting rungs.
run("js/data/survey.js"); run("js/core/profile.js");
const n = T(`nutritionTargets({ sex: "m", age: 30, heightCm: 175, weightKg: 70, activity: "light" }, "lose")`);
// BMR = 9.99*70 + 6.25*175 - 4.92*30 + 5 = 1650.45 → TDEE ×1.375 = 2269 → −5.5*70 = 1884
check(n.bmr === 1650 && n.tdee === 2250 && n.kcal === 1900, `lose-fat kcal ${JSON.stringify(n)}`);
check(n.protein[0] === 125 && n.protein[1] === 155, `lose-fat protein ${n.protein}`);
const g = T(`nutritionTargets({ sex: "f", age: 25, heightCm: 165, weightKg: 60, activity: "mod" }, "muscle")`);
// BMR = 599.4 + 1031.25 - 123 - 161 = 1346.65 → ×1.55 = 2087 → ×1.1 = 2296
check(g.kcal === 2300 && g.protein[0] === 95 && g.protein[1] === 130, `muscle targets ${JSON.stringify(g)}`);
check(T(`nutritionTargets({ sex: "m", age: 16, heightCm: 175, weightKg: 70, activity: "light" }, "lose")`).minor === true, "under-18 guardrail");
const thin = T(`nutritionTargets({ sex: "f", age: 25, heightCm: 170, weightKg: 50, activity: "sed" }, "lose")`);
check(thin.kcal === thin.tdee, "BMI<18.5 never gets a deficit");
const big = T(`nutritionTargets({ sex: "m", age: 40, heightCm: 175, weightKg: 120, activity: "sed" }, "general")`);
check(big.protein[0] === 125, `BMI≥30 protein uses BMI-25 reference weight (${big.protein})`);
T(`settings.equipment = ["bar", "dips", "chair"]; settings.sets = undefined; applyEquipment();`);
const pr = (key, pl) => T(`placementRung(exDef("${key}"), ${JSON.stringify(pl)}, settings.equipment)`);
check(pr("pushup", { push: 2 }) === 2, "8–19 push-ups → Push-ups");
check(pr("pullup", { pull: 1 }) === 0, "1–4 pull-ups, no band → snaps down to negatives");
check(pr("row", { pull: 2 }) === 2, "5–11 pull-ups → feet-elevated rows (chair available)");
check(pr("dip", { push: 0 }) === 0, "0 push-ups → bench dips");
check(T(`buildPlan(settings.equipment, 2).plan.A.exercises.every(e => e.sets === 2)`), "25-min option = 2 sets");

// 6. Deload weeks.
run("js/core/stats.js"); run("js/core/deload.js");
T(`settings.equipment = ["bar", "dips", "chair"]; applyEquipment(); levels = { pushup: 2 }; settings.deload = undefined;`);
const W = 7 * 864e5, t0 = Date.now() - 10 * W;
const sess = (t, extra = "") => `{ workout: "A", started: ${t}, ended: ${t + 1}, ${extra} entries: [{ key: "pushup", name: "Push-ups", level: 2, type: "reps", sets: [{ r: "15", done: true }, { r: "15", done: true }, { r: "15", done: true }] }] }`;
T(`history = [${[0, 1, 2, 3, 4].map(i => sess(t0 + i * W)).join(",")}];`);
check(T("deloadDue()") === false, "5 trained weeks → no deload suggested yet");
T(`history.push(${sess(t0 + 5 * W)});`);
check(T("deloadDue()") === true, "6 trained weeks → deload suggested");
check(T("readyToLevel().length") === 1, "pushup maxed (15s) → level-up ready before deload");
T("snoozeDeload()");
check(T("deloadDue()") === false, "Not now → snoozed for a week");
T("settings.deload.snooze = 0; startDeload()");
check(T("deloadActive()") && T("readyToLevel().length") === 0 && T(`suggest(exDef("pushup")).tone`) === "own", "during deload: no level-up pressure, easy coaching");
check(T("deloadSets(3)") === 2 && T("deloadSets(2)") === 1 && T("deloadSets(1)") === 1, "sets cut by about a third (3→2, 2→1, never 0)");
T(`history.push(${sess(Date.now() - 1000, 'deload: true,').replace(/"15"/g, '"8"')});`);
check(T(`lastEntry("pushup").sets[0].r`) === "15", "deload sessions don't become next session's targets");
T("settings.deload.active.end = Date.now() - 1; settleDeload()");
check(!T("deloadActive()") && T("deloadDue()") === false && T("readyToLevel().length") === 1, "expired deload closes itself; counter restarts; level-up readiness returns");

// 7. Bodyweight log.
run("js/core/weights.js");
const D1 = 864e5, now0 = Date.now();
T(`weights = {}; [${[...Array(14)].map((_, i) => i).join(",")}].forEach(i => logWeight(i < 7 ? 79.2 : 80, ${now0} - i * ${D1}));`);
check(Math.abs(T("weekAvg(0)") - 79.2) < 1e-9 && Math.abs(T("weekAvg(7)") - 80) < 1e-9, "7-day averages: this week vs last week");
let pc = T(`paceCheck("lose")`);
check(pc.status === "ok" && Math.abs(pc.pct + 1) < 0.01, "−1%/week while cutting → on track");
check(T(`paceCheck("muscle")`).status === "slow" && T(`paceCheck("muscle")`).fix === 150, "losing while trying to gain → add 150 kcal");
T(`weights = {}; [${[...Array(14)].map((_, i) => i).join(",")}].forEach(i => logWeight(80, ${now0} - i * ${D1}));`);
check(T(`paceCheck("lose")`).status === "slow" && T(`paceCheck("lose")`).fix === -150, "flat weight while cutting → trim 150 kcal");
T(`weights = {}; logWeight(80, ${now0}); logWeight(81, ${now0});`);
check(T("weightEntries().length") === 1 && T("weightEntries()[0].kg") === 81, "one entry per day; re-logging replaces it");
check(T("weekAvg(0)") === null && T("currentWeightKg()") === 81, "fewer than 3 weigh-ins → no average, latest entry used");
T(`deleteWeight(dayKey(${now0}))`);
check(T("weightEntries().length") === 0 && T("currentWeightKg()") === null, "deleted entries disappear");
const wa = { "2026-09-01": { kg: 80, at: 1 }, "2026-09-02": { kg: 79.8, at: 5 } }, wb = { "2026-09-02": { kg: null, at: 9 }, "2026-09-03": { kg: 79.5, at: 3 } };
const wm = T(`mergeWeights(${JSON.stringify(wa)}, ${JSON.stringify(wb)})`);
check(Object.keys(wm).length === 3 && wm["2026-09-02"].kg === null, "merge: newest change per day wins, deletions stick");

const sample = eq => { const p = T(`buildPlan(${JSON.stringify(eq)})`); return ["A", "B"].map(w => w + ": " + p.plan[w].exercises.map(e => e.key).join(", ")).join("\n   ") + (p.gaps.length ? "\n   gaps: " + p.gaps.length : ""); };
console.log("default  →", sample(["bar", "dips", "chair"]));
console.log("nothing  →", sample([]));
console.log("bands    →", sample(["band"]));
console.log("rings    →", sample(["rings", "chair"]));
console.log(`${names.size} variations, ${noVideo.length} without a curated video (open a YouTube search instead)`);
console.log(fails ? `${fails} FAILURES` : "ALL CHECKS PASS");
process.exit(fails ? 1 : 0);
