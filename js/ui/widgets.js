/* Small render helpers shared by several screens. */
function ringSvg(pct, size, stroke, color = "var(--volt)", inner = "") {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}">
      <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
      <circle class="val" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"
        style="stroke:${color}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp(pct, 0, 1))}"/>
    </svg><div class="lbl">${inner}</div></div>`;
}
/* Update an existing ring's fill without re-rendering it. */
function setRing(ringEl, pct) {
  const v = ringEl.querySelector(".val"), c = parseFloat(v.getAttribute("stroke-dasharray"));
  v.style.strokeDashoffset = c * (1 - clamp(pct, 0, 1));
}

function pipsHtml(key, w = "") {
  const ex = exDef(key), lv = lvlOf(key);
  return `<div class="pips ${w}">${ex.levels.map((_, i) => `<i class="${i < lv ? "on" : i === lv ? "cur" : ""} ${rungOk(key, i) ? "" : "na"}"></i>`).join("")}</div>`;
}

const ICON = {
  gear: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  back: `<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>`,
  close: `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  up: `<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>`,
  down: `<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>`,
  minus: `<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>`,
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
  timer: `<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>`,
  fire: `<svg viewBox="0 0 24 24"><path d="M12 22c4.4 0 7-2.9 7-6.8 0-3.3-2-5.6-3.6-7.3-.5 1.9-1.6 3-2.7 3.4.4-3.8-1.3-6.9-4.2-9.3.2 3.1-1.5 5.3-3 7.2C4.3 11.1 5 13.6 5 15.2 5 19.1 7.6 22 12 22z" fill="currentColor" stroke="none"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>`,
  list: `<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
  lock: `<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
};
