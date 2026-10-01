/* Exercise library for the plan generator. Pure bodyweight, A/B full body, variation-ladder progression (LOCKED design).
   The plan = 12 movement-pattern SLOTS. Each slot lists candidate ladders in priority order; the generator picks the
   first one your equipment allows (and whose key isn't already used). A rung written as ["Name", "need"] needs that
   equipment ("a|b" = either one); rungs you can't do are skipped when climbing.
   With EQUIP_DEFAULT the generator reproduces the original hand-built plan (same keys → history carries over),
   plus the hamstring-curl slot added to Workout A on 2026-10-01.
   type: "reps" = log reps · "timed" = log seconds. */

const EQUIPMENT = [
  { id: "bar",   name: "Pull-up bar",            hint: "Doorway or wall-mounted" },
  { id: "dips",  name: "Dip bars",               hint: "Parallel bars or a dip station" },
  { id: "rings", name: "Rings / suspension",     hint: "Gym rings or a TRX-style trainer" },
  { id: "band",  name: "Resistance bands",       hint: "Loop bands for assistance or pulling" },
  { id: "chair", name: "Sturdy furniture",       hint: "Chair, bench, box or couch to prop on or hook feet under" },
  { id: "table", name: "Sturdy table / low bar", hint: "Something waist-high you can hang under and row" },
];
const EQUIP_DEFAULT = ["bar", "dips", "chair"];

const SLOTS = {
  A: [
    { cat: "Vertical Pull", type: "reps", sets: 3, lo: 5, hi: 12, rest: 120, options: [
      { key: "pullup", needs: "bar", levels: ["Pull-up Negatives (5s down)", ["Band-Assisted Pull-ups", "band"], "Pull-ups", "L-sit Pull-ups", "Archer Pull-ups", "One-arm Pull-up Progression"] },
      { key: "ring_pullup", needs: "rings", levels: ["Ring Pull-up Negatives (5s down)", ["Band-Assisted Ring Pull-ups", "band"], "Ring Pull-ups", "L-sit Ring Pull-ups", "Archer Ring Pull-ups"] },
      { key: "band_pulldown", needs: "band", lo: 8, hi: 15, levels: ["Kneeling Band Pulldowns (light band)", "Kneeling Band Pulldowns (medium band)", "Kneeling Band Pulldowns (heavy band)", "Single-arm Band Pulldowns"] },
      { key: "door_row", lo: 8, hi: 15, levels: ["Doorframe Rows (upright)", "Doorframe Rows (deep lean)", "Single-arm Doorframe Rows"] },
    ]},
    { cat: "Vertical Push", type: "reps", sets: 3, lo: 5, hi: 12, rest: 120, options: [
      { key: "dip", needs: "dips", levels: [["Bench Dips (feet on floor)", "chair"], "Dip Negatives (5s down)", "Bar Dips", "L-sit Dips", "Deep Dips", "Korean Dips"] },
      { key: "ring_dip", needs: "rings", levels: ["Ring Dip Negatives (5s down)", ["Band-Assisted Ring Dips", "band"], "Ring Dips", "Deep Ring Dips", "RTO Ring Dips"] },
      { key: "chair_dip", needs: "chair", lo: 8, hi: 15, levels: ["Bench Dips (knees bent)", "Bench Dips (legs straight)", "Bench Dips (feet elevated)", "Single-leg Bench Dips"] },
      { key: "close_pushup", lo: 6, hi: 15, levels: ["Incline Close-grip Push-ups", "Close-grip Push-ups", "Diamond Push-ups", "Bodyweight Triceps Extensions"] },
    ]},
    { cat: "Horizontal Push", type: "reps", sets: 3, lo: 5, hi: 15, rest: 90, options: [
      { key: "pushup", levels: ["Incline Push-ups", "Knee Push-ups", "Push-ups", "Diamond Push-ups", ["Decline Push-ups", "chair"], "Archer Push-ups", "Pseudo-Planche Push-ups"] },
    ]},
    { cat: "Legs · Knee", type: "reps", sets: 3, lo: 8, hi: 15, rest: 90, options: [
      { key: "squat", levels: ["Bodyweight Squats", "Tempo Squats (3s down)", "Squat Jumps", "Split Squats", ["Bulgarian Split Squats", "chair"], "Pistol Squats"] },
    ]},
    { cat: "Legs · Hamstrings", type: "reps", sets: 3, lo: 6, hi: 12, rest: 90, options: [
      { key: "legcurl", levels: ["Sliding Leg Curl Negatives (3s out)", "Sliding Leg Curls", "Single-leg Sliding Leg Curl Negatives", "Single-leg Sliding Leg Curls"] },
    ]},
    { cat: "Core · Flexion", type: "reps", sets: 3, lo: 6, hi: 15, rest: 75, options: [
      { key: "hlr", needs: "bar|rings", levels: ["Lying Leg Raises", "Hanging Knee Tucks", "Hanging Knee Raises", "Hanging Leg Raises", "Toes-to-Bar"] },
      { key: "floor_flex", levels: ["Dead Bugs", "Reverse Crunches", "Lying Leg Raises", "V-ups"] },
    ]},
    { cat: "Core · Anti-extension", type: "timed", sets: 3, lo: 20, hi: 45, rest: 60, options: [
      { key: "plank", levels: ["Knee Plank", "Plank", "Long-Lever Plank", "RKC Plank", "Single-arm Plank"] },
    ]},
  ],
  B: [
    { cat: "Vertical Pull", type: "reps", sets: 3, lo: 5, hi: 12, rest: 120, options: [
      { key: "chinup", needs: "bar", levels: ["Chin-up Negatives (5s down)", ["Band-Assisted Chin-ups", "band"], "Chin-ups", "L-sit Chin-ups", "Archer Chin-ups"] },
      { key: "ring_chinup", needs: "rings", levels: ["Ring Chin-up Negatives (5s down)", "Ring Chin-ups", "L-sit Ring Chin-ups", "Archer Ring Chin-ups"] },
      { key: "band_facepull", needs: "band", lo: 10, hi: 20, levels: ["Band Pull-aparts", "Band Face Pulls", "Band Face Pulls (heavier band)"] },
      { key: "back_floor", lo: 8, hi: 15, levels: ["Prone Y-T-W Raises", "Prone Y-T-W Raises (2s holds)", "Reverse Snow Angels"] },
    ]},
    { cat: "Horizontal Pull", type: "reps", sets: 3, lo: 6, hi: 15, rest: 90, options: [
      { key: "row", needs: "bar|dips|table", levels: ["Incline Rows (upright)", "Inverted Rows", ["Feet-Elevated Inverted Rows", "chair"], "Archer Rows", "One-arm Row Progression"] },
      { key: "ring_row", needs: "rings", levels: ["Ring Rows (upright)", "Ring Rows", ["Feet-Elevated Ring Rows", "chair"], "Archer Ring Rows", "One-arm Ring Rows"] },
      { key: "band_row", needs: "band", lo: 8, hi: 15, levels: ["Seated Band Rows (light band)", "Seated Band Rows (heavy band)", "Single-arm Band Rows"] },
      { key: "door_row", lo: 8, hi: 15, levels: ["Doorframe Rows (upright)", "Doorframe Rows (deep lean)", "Single-arm Doorframe Rows"] },
      { key: "back_floor", lo: 8, hi: 15, levels: ["Prone Y-T-W Raises", "Prone Y-T-W Raises (2s holds)", "Reverse Snow Angels"] },
    ]},
    { cat: "Vertical Push · Shoulders", type: "reps", sets: 3, lo: 5, hi: 12, rest: 120, options: [
      { key: "pike", levels: ["Pike Push-ups", ["Feet-Elevated Pike Push-ups", "chair"], "Deficit Pike Push-ups", "Wall HSPU Negatives", "Wall Handstand Push-ups"] },
    ]},
    { cat: "Legs · Single-leg", type: "reps", sets: 3, lo: 6, hi: 12, rest: 90, options: [
      { key: "lunge", levels: ["Reverse Lunges", ["Bulgarian Split Squats", "chair"], "Assisted Pistol Squats", "Shrimp Squats", "Pistol Squats"] },
    ]},
    { cat: "Legs · Posterior", type: "reps", sets: 3, lo: 6, hi: 12, rest: 90, options: [
      { key: "hamstring", levels: ["Glute Bridges", "Single-leg Glute Bridges", ["Nordic Curl Negatives", "chair|band"], ["Assisted Nordic Curls", "chair|band"], ["Nordic Curls", "chair|band"]] },
    ]},
    { cat: "Core · Compression", type: "timed", sets: 3, lo: 20, hi: 45, rest: 60, options: [
      { key: "hollow", levels: ["Tuck Hollow Hold", "Hollow Hold", "Hollow Hold (arms overhead)", "Hollow Rocks", "Extended Hollow Rocks"] },
    ]},
  ],
};

/* Honest gaps, shown in the equipment screen when a slot had to fall back. key → note */
const GAP_NOTES = {
  door_row: "No bar, rings or bands: vertical pulling is limited to doorframe rows. A doorway pull-up bar is the single biggest upgrade for this plan.",
  back_floor: "No way to row your bodyweight: upper-back work is light (floor raises only). Bands, rings, a sturdy table or a low bar fix this.",
  band_pulldown: "Band pulldowns stand in for pull-ups. They work the same muscles, but a pull-up bar lets you progress much further.",
  floor_flex: "No bar or rings to hang from, so core flexion uses floor moves.",
  close_pushup: "No dip bars or furniture: triceps/dip work becomes close-grip push-up variations.",
};
