/* Nutrition ("Fuel") tile on Home + detail sheet. Targets come from the survey profile. */
function fuelTileHtml() {
  const n = myNutrition();
  if (!n || n.minor) return "";
  return `
    <button class="fuel-tile" id="fuelBtn">
      <div><div class="eyebrow">Daily fuel</div>
        <div class="fuel-nums"><span class="display">${n.protein[0]}–${n.protein[1]}<small>g</small></span><em>protein</em>
        <span class="display">${n.kcal.toLocaleString()}</span><em>kcal</em></div></div>
      ${ICON.arrow}
    </button>`;
}

function openFuel() {
  const n = myNutrition(); if (!n) return;
  openSheet(`
    <h3>Daily fuel</h3>
    <p>Estimated from your survey answers. Retake the survey when your weight changes by a few kilos.</p>
    ${nutritionCard(n)}
    <button class="btn block" style="margin-top:16px" id="fuelDone">Got it</button>`,
    root => { root.querySelector("#fuelDone").onclick = closeSheet; });
  $("#sheet").onclick = e => { if (e.target.id === "sheet") closeSheet(); };
}
