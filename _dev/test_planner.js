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

const sample = eq => { const p = T(`buildPlan(${JSON.stringify(eq)})`); return ["A", "B"].map(w => w + ": " + p.plan[w].exercises.map(e => e.key).join(", ")).join("\n   ") + (p.gaps.length ? "\n   gaps: " + p.gaps.length : ""); };
console.log("default  →", sample(["bar", "dips", "chair"]));
console.log("nothing  →", sample([]));
console.log("bands    →", sample(["band"]));
console.log("rings    →", sample(["rings", "chair"]));
console.log(`${names.size} variations, ${noVideo.length} without a curated video (open a YouTube search instead)`);
console.log(fails ? `${fails} FAILURES` : "ALL CHECKS PASS");
process.exit(fails ? 1 : 0);
