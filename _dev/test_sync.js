/* Two simulated devices against the LIVE sync worker. Run: node _dev/test_sync.js
   Creates a throwaway sync space and deletes ONLY that row when done (the table also holds his real data —
   never clean up with an unscoped DELETE). */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const FILES = ["js/data/plan.js", "js/data/cues.js", "js/data/videos.js", "js/core/util.js", "js/core/store.js", "js/core/weights.js", "js/core/planner.js", "js/core/sync.js"];

function device(seed = {}) {
  const ls = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  const ctx = {
    console, fetch, setTimeout, clearTimeout, navigator: { onLine: true },
    localStorage: { getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
  };
  vm.createContext(ctx);
  FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }));
  vm.runInContext("onDataChanged = () => {};", ctx);   // tests call syncNow() explicitly
  return code => vm.runInContext(code, ctx);
}

let fails = 0;
const check = (ok, msg) => { console.log((ok ? "ok   " : "FAIL ") + msg); if (!ok) fails++; };
const h = (t, w = "A") => ({ workout: w, started: t, ended: t + 1, entries: [] });

(async () => {
  // PC: legacy data from before sync existed (no meta timestamps at all).
  const pc = device({ wo_history_v2: [h(1000), h(2000, "B")], wo_levels_v2: { pullup: 2, squat: 1 }, wo_settings_v2: { weeklyGoal: 3, equipment: ["bar", "dips", "chair"] } });
  const phone = device({});

  await pc("createSyncSpace()");
  const id = pc("sync.id");
  console.log("space", id);
  check(/^[0-9A-HJKMNP-TV-Z]{20}$/.test(id), "server issued a 20-char sync code");

  await phone(`joinSyncSpace("${id.toLowerCase().replace(/(.{5})/g, "$1 ")}")`);   // sloppy typing still works
  check(phone("history.length") === 2 && phone("levels.pullup") === 2, "phone received PC history + levels on join");
  check(JSON.stringify(phone("settings.equipment")) === '["bar","dips","chair"]', "phone received equipment");

  // Offline edits on both devices.
  phone(`history.push(${JSON.stringify(h(3000))}); saveHistory(); setLevel("pushup", 3);`);
  pc(`deleteSession(0); setLevel("pullup", 3);`);
  phone(`settings.sound = false; saveSettings();`);              // device-only setting
  await new Promise(r => setTimeout(r, 5));
  phone(`settings.equipment = ["bar", "dips", "chair", "band"]; saveSettings();`);   // newer plan setting

  // Both sync at the same moment → one of them hits a version conflict and retries.
  await Promise.all([pc("syncNow()"), phone("syncNow()")]);
  await pc("syncNow()"); await phone("syncNow()");

  for (const [name, d] of [["pc", pc], ["phone", phone]]) {
    check(JSON.stringify(d("history.map(x => x.started)")) === "[2000,3000]", `${name}: history = deleted h1 gone, phone's h3 present`);
    check(d("levels.pullup") === 3 && d("levels.pushup") === 3 && d("levels.squat") === 1, `${name}: newest level per exercise kept`);
    check(d("settings.equipment.includes('band')"), `${name}: newest equipment setting wins`);
    check(!d("sync.error"), `${name}: no sync error`);
  }
  check(pc("settings.sound") !== false, "pc: sound stays per-device");
  check(pc("exDef('pullup').needs.includes('band') && rungOk('pullup', 1)"), "pc: plan rebuilt for synced equipment (band rung available)");

  // A deletion made after the other device already has the session must not come back.
  phone(`deleteSession(history.findIndex(x => x.started === 2000));`);
  await phone("syncNow()"); await pc("syncNow()"); await phone("syncNow()");
  check(pc("history.length") === 1 && phone("history.length") === 1, "deletion propagates and doesn't resurrect");

  // Weigh-ins from both devices merge; a deletion on one removes it on the other.
  phone(`logWeight(80.4, Date.now() - 864e5)`); pc(`logWeight(80.1)`);
  await phone("syncNow()"); await pc("syncNow()"); await phone("syncNow()");
  check(pc("weightEntries().length") === 2 && phone("weightEntries().length") === 2, "weigh-ins from both devices merged");
  pc(`deleteWeight(dayKey(Date.now() - 864e5))`);
  await pc("syncNow()"); await phone("syncNow()");
  check(phone("weightEntries().length") === 1, "weigh-in deletion propagates");

  // Unknown code is rejected cleanly.
  const bad = device({});
  let err = null; try { await bad(`joinSyncSpace("00000000000000000000")`); } catch (e) { err = e.message; }
  check(/No sync found/.test(err || ""), "unknown code → clear error");

  console.log(fails ? `${fails} FAILURES` : "ALL SYNC CHECKS PASS");
  if (!/^[0-9A-HJKMNP-TV-Z]{20}$/.test(id)) throw new Error("refusing to clean up: bad id " + id);
  require("child_process").execSync(`npx wrangler d1 execute workout-sync --remote --command "DELETE FROM spaces WHERE id = '${id}'"`,
    { cwd: path.join(root, "worker"), stdio: "ignore" });
  console.log("cleaned up test space " + id);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
