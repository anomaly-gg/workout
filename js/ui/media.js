/* Exercise imagery (tutorial thumbnails) and the in-app tutorial player. */
function thumbUrl(name) {
  const id = VIDEOS[name];
  if (!id) return null;
  return "https://i.ytimg.com/vi/" + id + "/" + (NO_MAXRES.has(id) ? "hqdefault" : "maxresdefault") + ".jpg";
}
/* Treated photo layer; falls back to a plain gradient when offline / no video. */
function photoHtml(name, tint = "") {
  const url = thumbUrl(name);
  return `<div class="photo ${tint ? "tint-" + tint : ""}">${url ? `<img src="${url}" alt="" loading="lazy" onerror="this.remove()">` : ""}</div>`;
}

function heroPhotoHtml(w) {
  const h = HERO_PHOTOS[w];
  return `<div class="photo tint-${w}"><img src="https://i.ytimg.com/vi/${h.id}/maxresdefault.jpg" style="object-position:${h.pos}" alt="" onerror="this.remove()"></div>`;
}

const PLAY_ICON = `<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/></svg>`;

function openTutorial(name) {
  const id = VIDEOS[name];
  // YouTube embeds need a real http(s) origin — they error (153) when the page is a file://.
  const canEmbed = location.protocol === "http:" || location.protocol === "https:";
  if (id && canEmbed) {
    $("#vidTitle").textContent = name;
    $("#vidFrame").src = "https://www.youtube-nocookie.com/embed/" + id + "?rel=0&autoplay=1&playsinline=1";
    $("#vidOpen").href = "https://www.youtube.com/watch?v=" + id;
    $("#vidOverlay").classList.remove("hidden");
    return;
  }
  const url = id
    ? "https://www.youtube.com/watch?v=" + id
    : "https://www.youtube.com/results?search_query=" + encodeURIComponent(name.replace(/\s*\(.*?\)/g, "").trim() + " exercise form tutorial");
  window.open(url, "_blank");
}
function closeVideo() { $("#vidFrame").src = ""; $("#vidOverlay").classList.add("hidden"); }
