/* Onboarding survey content. Placement answers map to starting rungs (index into the FULL ladder). */

const GOALS = [
  { id: "muscle",   name: "Build muscle",    hint: "Get bigger and more defined" },
  { id: "strength", name: "Get stronger",    hint: "Unlock harder moves" },
  { id: "lose",     name: "Lose fat",        hint: "Lean out, keep your muscle" },
  { id: "general",  name: "General fitness", hint: "Feel better, move better" },
];
const DAYS = [
  { id: 2, name: "2 days", hint: "The ACSM minimum — still works" },
  { id: 3, name: "3 days", hint: "Recommended: every muscle 3× a week" },
  { id: 4, name: "4 days", hint: "A B A B — more volume, still recovers" },
];
const SESSION_TIME = [
  { id: 2, name: "~25 minutes", hint: "2 sets per exercise" },
  { id: 3, name: "~40 minutes", hint: "3 sets per exercise" },
];
const ACTIVITY = [
  { id: "sed",   f: 1.2,   name: "Mostly sitting",    hint: "Desk job, little walking" },
  { id: "light", f: 1.375, name: "Lightly active",    hint: "Light exercise 1–3 days a week" },
  { id: "mod",   f: 1.55,  name: "Moderately active", hint: "Exercise 3–5 days, or on your feet a lot" },
  { id: "very",  f: 1.725, name: "Very active",       hint: "Hard exercise most days, or a physical job" },
];

const PLACEMENT = [
  { id: "push", q: "Max push-ups in one go?", hint: "Chest to the floor, body straight. Guess if you're not sure.", opts: ["0", "1–7", "8–19", "20+"] },
  { id: "pull", q: "Max pull-ups in one go?", hint: "From a dead hang, chin over the bar.", opts: ["0", "1–4", "5–11", "12+"], needs: "bar|rings" },
  { id: "core", q: "Longest plank hold?", hint: "On your forearms, hips level.", opts: ["Under 20s", "20–45s", "45–90s", "90s+"] },
  { id: "legs", q: "Bodyweight squats in a row?", hint: "Thighs to parallel, heels down.", opts: ["Under 10", "10–24", "25+"] },
];

/* ladder key → [placement test, starting rung for each answer] */
const START_RUNG = {
  pushup: ["push", [0, 1, 2, 3]], close_pushup: ["push", [0, 0, 1, 2]], dip: ["push", [0, 0, 1, 2]],
  chair_dip: ["push", [0, 0, 1, 2]], ring_dip: ["push", [0, 0, 0, 0]], pike: ["push", [0, 0, 0, 1]],
  pullup: ["pull", [0, 1, 2, 3]], chinup: ["pull", [0, 1, 2, 3]], ring_pullup: ["pull", [0, 1, 2, 3]],
  ring_chinup: ["pull", [0, 0, 1, 2]], row: ["pull", [0, 1, 2, 3]], ring_row: ["pull", [0, 1, 2, 3]],
  hlr: ["core", [0, 1, 2, 3]], floor_flex: ["core", [0, 1, 2, 3]], plank: ["core", [0, 1, 2, 3]], hollow: ["core", [0, 0, 1, 2]],
  squat: ["legs", [0, 1, 2]], lunge: ["legs", [0, 0, 1]], hamstring: ["legs", [0, 0, 1]], legcurl: ["legs", [0, 0, 1]],
};

const GOAL_FOCUS = {
  muscle: "Take sets close to failure (1–3 reps left), eat in a small surplus and hit your protein every day.",
  strength: "Prioritise climbing to harder rungs — the low end of each rep range on a harder variation beats high reps on an easy one.",
  lose: "Your training keeps your muscle; the calorie deficit takes the fat. Diet does most of the fat-loss work.",
  general: "Consistency beats everything: show up for your weekly sessions and the rest follows.",
};

/* Nutrition sources (checked 2026-10-01). */
const NUTRITION_SOURCES = [
  { src: "Mifflin–St Jeor equation, Am J Clin Nutr 1990 (via NCI)", url: "https://cancercontrol.cancer.gov/brp/research/group-evaluated-measures/adopt/ree-pal" },
  { src: "ISSN position stand: protein and exercise, 2017", url: "https://pubmed.ncbi.nlm.nih.gov/28642676/" },
  { src: "Morton et al., Br J Sports Med, 2018", url: "https://bjsm.bmj.com/content/52/6/376" },
  { src: "Helms et al., fat-loss rate & protein, 2014", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4033492/" },
  { src: "Iraki et al., surplus & gain rate, 2019", url: "https://pubmed.ncbi.nlm.nih.gov/31247944/" },
];
