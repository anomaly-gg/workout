/* Survey maths: starting rungs from the placement test, and nutrition targets. No DOM. */

/* Starting rung for a ladder under the given equipment; snaps to a doable rung (down first, then up). */
function placementRung(ex, placement, equip) {
  const map = START_RUNG[ex.key];
  let i = map && placement[map[0]] !== undefined ? map[1][Math.min(placement[map[0]], map[1].length - 1)] : 0;
  i = clamp(i, 0, ex.levels.length - 1);
  const ok = j => has(equip, ex.needs[j]);
  if (ok(i)) return i;
  for (let j = i - 1; j >= 0; j--) if (ok(j)) return j;
  for (let j = i + 1; j < ex.levels.length; j++) if (ok(j)) return j;
  return i;
}

/* body: { sex: "m"|"f"|"x", age, heightCm, weightKg, activity } · goal: GOALS id */
function nutritionTargets(body, goal) {
  const { sex, age, heightCm: h, weightKg: w } = body;
  if (!(age > 0 && h > 0 && w > 0)) return null;
  const act = ACTIVITY.find(a => a.id === body.activity) || ACTIVITY[1];
  // Mifflin–St Jeor (1990): 9.99·kg + 6.25·cm − 4.92·age + 5 (male) / −161 (female). "x" = midpoint of the two.
  const bmr = 9.99 * w + 6.25 * h - 4.92 * age + (sex === "m" ? 5 : sex === "f" ? -161 : -78);
  const tdee = bmr * act.f;
  const bmi = w / ((h / 100) ** 2);
  const out = { bmr: r50(bmr), tdee: r50(tdee), bmi: Math.round(bmi * 10) / 10, notes: [], goal };

  if (age < 18) {
    out.minor = true;
    out.notes.push("Under 18: no calorie targets here. Eat enough to fuel growth and training — talk to a doctor or parent before any diet.");
    return out;
  }
  // Protein tracks lean mass — with a lot of body fat, use the weight at BMI 25 as the reference.
  const refW = bmi >= 30 ? 25 * (h / 100) ** 2 : w;
  if (refW !== w) out.notes.push("Protein is based on the weight you'd be at BMI 25, since protein needs follow lean mass, not fat.");

  if (goal === "lose" && bmi < 18.5) {
    out.notes.push("Your BMI is under 18.5, so a calorie deficit isn't recommended. Targets are set to maintenance — check with a doctor.");
    goal = "general";
  }
  if (goal === "lose") {
    out.kcal = Math.max(r50(tdee - 5.5 * w), r50(bmr));          // ≈0.5% bodyweight/week (Helms 2014: 0.5–1%)
    out.pace = `about −${(w * 0.005).toFixed(1)} kg a week (0.5% of bodyweight)`;
    out.protein = [r5(refW * 1.8), r5(refW * 2.2)];
  } else if (goal === "muscle") {
    out.kcal = r50(tdee * 1.1);                                     // +10% (Iraki 2019: 10–20%)
    out.pace = `about +${(w * 0.0025).toFixed(1)}–${(w * 0.005).toFixed(1)} kg a week (0.25–0.5%)`;
    out.protein = [r5(refW * 1.6), r5(refW * 2.2)];
  } else {
    out.kcal = r50(tdee);
    out.pace = "hold steady";
    out.protein = [r5(refW * 1.6), r5(refW * 2.0)];
  }
  out.notes.push("These are estimates — real needs vary by ±10–20%. Weigh yourself most mornings; if the weekly average isn't moving as planned after 2–3 weeks, adjust by about 150 kcal.");
  return out;
}
const r50 = v => Math.round(v / 50) * 50;
const r5  = v => Math.round(v / 5) * 5;

/* Unit helpers */
const lbToKg = lb => lb * 0.45359237;
const kgToLb = kg => kg / 0.45359237;
const ftInToCm = (ft, inch) => (ft * 12 + inch) * 2.54;
