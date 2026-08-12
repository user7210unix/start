/* ---------- clock ---------- */

function updateClock() {
  const now = new Date();
  document.getElementById("time").textContent =
    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  document.getElementById("date").textContent =
    now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

updateClock();
setInterval(updateClock, 1000);

/* ---------- weather ---------- */

// Font Awesome Free v7.3.1 glyphs (icons chosen deliberately, not literally —
// umbrella marks clear/sunny, the two cloud glyphs cover overcast/wet vs. partly cloudy)
const WEATHER_ICONS = {
  clear: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M561.5 405.1C555.6 421.8 536.2 428.1 520.4 420.2L342.2 331.1L340.6 334.3L251.8 512L544 512C561.7 512 576 526.3 576 544C576 561.7 561.7 576 544 576L96 576C78.3 576 64 561.7 64 544C64 526.3 78.3 512 96 512L180.2 512L283.4 305.7L285 302.5L119.6 219.8C103.8 211.9 97.2 192.5 107.1 177.8C153 109.2 231.2 64 320 64C461.4 64 576 178.6 576 320C576 349.8 570.9 378.5 561.5 405.1z"/></svg>`,
  overcast: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M208.3 256C251.4 256 288.8 280.4 307.5 316.1C322.2 298.9 343.9 288 368.3 288C412.5 288 448.3 323.8 448.3 368C448.3 373.5 447.7 378.9 446.7 384C447.2 384 447.8 384 448.3 384C501.3 384 544.3 427 544.3 480C544.3 533 501.3 576 448.3 576L128.3 576C75.3 576 32.3 533 32.3 480C32.3 437.5 60 401.5 98.3 388.8C97 382 96.3 375.1 96.3 368C96.3 306.1 146.4 256 208.3 256zM400.3 32.2C405.6 32.2 410.6 34.9 413.6 39.3L460.9 109.7L544.2 93.4C549.4 92.4 554.8 94.1 558.5 97.8C562.3 101.6 563.9 107 562.9 112.2L546.6 195.5L617 242.8C621.4 245.8 624.1 250.8 624.1 256.1C624.1 261.4 621.5 266.4 617.1 269.3L546.7 316.6L561.2 390.8C544 369.1 520.8 352.4 494 343.5C491.5 330.8 487.1 318.9 481.2 307.8C490.8 292.9 496.4 275.1 496.4 256.1C496.4 203.1 453.4 160.1 400.4 160.1C352.5 160.1 312.8 195.2 305.6 241C284.7 225 259.7 214 232.5 209.9L254 195.4L237.7 112.2L237.4 110.2C237.1 105.6 238.7 101.1 242 97.8C245.8 94 251.2 92.4 256.4 93.4L339.7 109.7L387 39.3L388.2 37.7C391.2 34.2 395.6 32.2 400.3 32.2zM400.3 208C426.8 208 448.3 229.5 448.3 256C448.3 259.8 447.8 263.6 446.9 267.1C425.2 250.2 398 240 368.3 240C363.7 240 359.2 240.2 354.8 240.7C361.2 221.7 379.1 208 400.3 208z"/></svg>`,
  partly: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M320 32C337.7 32 352 46.3 352 64L352 66C478.3 81.7 576 189.5 576 320C576 323.8 575.9 327.5 575.8 331.3C575.5 338.2 570.8 344.1 564.1 346C557.4 347.9 550.3 345.3 546.5 339.5C532.1 318.1 507.7 304 480 304C450.7 304 425.1 319.7 411.1 343.3C408.4 347.9 403.5 350.9 398.1 351.1C392.7 351.3 387.6 348.9 384.4 344.6C369.8 324.8 346.4 312 319.9 312C293.4 312 270 324.8 255.4 344.6C252.2 348.9 247.1 351.4 241.7 351.1C236.3 350.8 231.5 347.9 228.7 343.3C214.7 319.7 189.1 304 159.8 304C132.1 304 107.7 318.1 93.3 339.5C89.4 345.2 82.3 347.9 75.7 346C69.1 344.1 64.5 338.2 64.2 331.3C64.1 327.5 64 323.8 64 320C64 189.5 161.7 81.7 288 66L288 64C288 46.3 302.3 32 320 32zM352 392L352 494.6C352 539.6 315.5 576 270.6 576C239.8 576 211.6 558.6 197.8 531L195.5 526.3C187.6 510.5 194 491.3 209.8 483.4C225.6 475.5 244.8 481.9 252.7 497.7L255 502.4C258 508.3 264 512 270.6 512C280.2 512 288 504.2 288 494.6L288 392C288 374.3 302.3 360 320 360C337.7 360 352 374.3 352 392z"/></svg>`,
};

function pickWeatherIcon(desc) {
  const d = (desc || "").toLowerCase();
  if (/(overcast|rain|shower|drizzle|thunder|snow|sleet|mist|fog|storm)/.test(d)) {
    return WEATHER_ICONS.overcast;
  }
  if (/cloud/.test(d)) {
    return WEATHER_ICONS.partly;
  }
  // clear / sunny / fair / default
  return WEATHER_ICONS.clear;
}

async function loadWeather() {
  try {
    const res = await fetch("https://wttr.in/?format=j1");
    if (!res.ok) throw new Error("weather unavailable");
    const data = await res.json();
    const current = data.current_condition && data.current_condition[0];
    const area = data.nearest_area && data.nearest_area[0];
    if (!current) throw new Error("no data");

    const tempC = current.temp_C;
    const desc = (current.weatherDesc && current.weatherDesc[0] && current.weatherDesc[0].value) || "";

    document.getElementById("weather-temp").textContent = `${tempC}°`;
    document.getElementById("weather-cond").textContent = desc.toLowerCase();
    document.getElementById("weather-icon").innerHTML = pickWeatherIcon(desc);

    if (area) {
      const areaName = area.areaName && area.areaName[0] && area.areaName[0].value;
      const country = area.country && area.country[0] && area.country[0].value;
      document.getElementById("weather-loc").textContent =
        [areaName, country].filter(Boolean).join(", ");
    }
  } catch (_) {
    document.getElementById("weather-cond").textContent = "weather unavailable";
    document.getElementById("weather-icon").innerHTML = WEATHER_ICONS.partly;
  }
}

loadWeather();
setInterval(loadWeather, 15 * 60 * 1000);

/* ---------- quicklinks tree, grouped by tag ---------- */

function groupByTag(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = item.tag || item.label || "misc";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return groups;
}

function renderLinks(items) {
  const container = document.getElementById("links");
  container.innerHTML = "";

  const groups = groupByTag(items);

  groups.forEach((groupItems, tag) => {
    const groupEl = document.createElement("div");
    groupEl.className = "tree-group";

    const label = document.createElement("div");
    label.className = "group-label";
    label.textContent = tag;
    groupEl.appendChild(label);

    const list = document.createElement("ul");
    list.className = "tree";

    groupItems.forEach((item, i) => {
      const last = i === groupItems.length - 1;
      const branch = last ? "└─" : "├─";
      const fav = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.url)}&sz=64`;

      const li = document.createElement("li");

      const branchSpan = document.createElement("span");
      branchSpan.className = "branch";
      branchSpan.textContent = branch;

      const badge = document.createElement("span");
      badge.className = "favicon-badge";
      const img = document.createElement("img");
      img.src = fav;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = () => { badge.style.visibility = "hidden"; };
      badge.appendChild(img);

      const a = document.createElement("a");
      a.href = item.url;
      a.textContent = item.name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";

      li.append(branchSpan, badge, a);
      list.appendChild(li);
    });

    groupEl.appendChild(list);
    container.appendChild(groupEl);
  });

  document.getElementById("link-count").textContent = `${items.length} links · ${groups.size} groups`;
}

async function loadLinks() {
  const res = await fetch("links.json");
  if (!res.ok) throw new Error("links.json not found");
  const data = await res.json();
  renderLinks(data);
}

loadLinks().catch(err => {
  document.getElementById("links").innerHTML =
    `<div class="tree-group"><ul class="tree"><li><span class="branch">└─</span> ${err.message}</li></ul></div>`;
});
