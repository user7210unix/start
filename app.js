(() => {
  "use strict";


  const PROXY = "https://chan-proxy.anonnousmes.workers.dev/?url=";
  const proxied = (url) => PROXY + encodeURIComponent(url);

  /* . storage helpers . */

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    }
  };

  /* . defaults . */

  const ALL_BOARDS = [
    { id: "g",   nsfw: false, label: "/g/" },
    { id: "v",   nsfw: false, label: "/v/" },
    { id: "pol", nsfw: false, label: "/pol/" },
    { id: "r9k", nsfw: false, label: "/r9k/" },
    { id: "a",   nsfw: false, label: "/a/" },
    { id: "fit", nsfw: false, label: "/fit/" },
    { id: "k",   nsfw: false, label: "/k/" },
    { id: "b",   nsfw: true,  label: "/b/" },
  ];
  const DEFAULT_ACTIVE_BOARDS = ["g", "v", "pol", "r9k"];

  const DEFAULT_LINKS = [
    { name: "youtube", url: "https://youtube.com" },
    { name: "gmail",   url: "https://mail.google.com" },
    { name: "google",  url: "https://google.com" },
    { name: "github",  url: "https://github.com" },
    { name: "/pol/",   url: "https://boards.4chan.org/pol/" },
    { name: "/r9k/",   url: "https://boards.4chan.org/r9k/" },
    { name: "reddit",  url: "https://reddit.com" },
    { name: "x",       url: "https://x.com" },
  ];

  let activeBoards = store.get("vitrine.boards", DEFAULT_ACTIVE_BOARDS);
  let links = store.get("vitrine.links", DEFAULT_LINKS);
  let settings = store.get("vitrine.settings", { autoRefresh: false, blur: true, nsfw: false });
  let wallpaper = store.get("vitrine.wallpaper", null);

  let refreshTimer = null;

  /* . wallpaper . */

  function applyWallpaper() {
    if (wallpaper) {
      document.documentElement.style.setProperty("--bg-image", `url('${wallpaper}')`);
    } else {
      document.documentElement.style.removeProperty("--bg-image");
    }
  }

  const wallpaperForm = document.getElementById("wallpaperForm");
  const wallpaperInput = document.getElementById("wallpaperUrl");
  wallpaperInput.value = wallpaper || "";

  wallpaperForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = wallpaperInput.value.trim();
    if (!val) return;
    wallpaper = val;
    store.set("vitrine.wallpaper", wallpaper);
    applyWallpaper();
  });

  document.getElementById("wallpaperReset").addEventListener("click", () => {
    wallpaper = null;
    wallpaperInput.value = "";
    store.set("vitrine.wallpaper", null);
    applyWallpaper();
  });

  applyWallpaper();

  /* . clock . */

  function tickClock() {
    const now = new Date();
    const timeEl = document.getElementById("clockTime");
    const dateEl = document.getElementById("clockDate");
    timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    dateEl.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
      .toUpperCase();

    const h = now.getHours();
    const greeting = document.getElementById("greeting");
    if (h < 5) greeting.textContent = "still up?";
    else if (h < 12) greeting.textContent = "good morning.";
    else if (h < 18) greeting.textContent = "good afternoon.";
    else if (h < 23) greeting.textContent = "good evening.";
    else greeting.textContent = "still up?";
  }
  tickClock();
  setInterval(tickClock, 15000);

  /* . search . */

  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");
  const searchWrap = document.getElementById("searchWrap");
  const searchSuggest = document.getElementById("searchSuggest");

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
  });

  // spacebar opens + focuses search from anywhere, unless the person is
  // already typing into an input, textarea, or contenteditable field.
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.metaKey || e.ctrlKey || e.altKey) return;
    const el = document.activeElement;
    // only steal the spacebar when nothing else is focused — buttons,
    // toggles, and chips all use space themselves and must keep working.
    const idle = !el || el === document.body;
    if (!idle) return;
    e.preventDefault();
    searchInput.focus();
    searchForm.classList.remove("search-pop");
    // eslint-disable-next-line no-unused-expressions
    void searchForm.offsetWidth; // restart animation
    searchForm.classList.add("search-pop");
  });

  /* . IDE-style autosuggest . */

  const SITES = [
    { name: "youtube",    aliases: ["yt"],           icon: "fa-brands fa-youtube",        url: "https://youtube.com" },
    { name: "google",     aliases: ["g"],             icon: "fa-brands fa-google",         url: "https://google.com" },
    { name: "gmail",      aliases: ["mail"],          icon: "fa-solid fa-envelope",        url: "https://mail.google.com" },
    { name: "github",     aliases: ["gh"],            icon: "fa-brands fa-github",         url: "https://github.com" },
    { name: "reddit",     aliases: [],                icon: "fa-brands fa-reddit-alien",   url: "https://reddit.com" },
    { name: "x",          aliases: ["twitter"],       icon: "fa-brands fa-x-twitter",      url: "https://x.com" },
    { name: "4chan",      aliases: ["chan"],          icon: "fa-solid fa-trash",            url: "https://www.4chan.org" },
    { name: "wikipedia",  aliases: ["wiki"],          icon: "fa-brands fa-wikipedia-w",    url: "https://wikipedia.org" },
    { name: "amazon",     aliases: [],                icon: "fa-brands fa-amazon",         url: "https://amazon.com" },
    { name: "twitch",     aliases: [],                icon: "fa-brands fa-twitch",         url: "https://twitch.tv" },
    { name: "discord",    aliases: [],                icon: "fa-brands fa-discord",        url: "https://discord.com/app" },
    { name: "spotify",    aliases: [],                icon: "fa-brands fa-spotify",        url: "https://open.spotify.com" },
    { name: "instagram",  aliases: ["ig"],            icon: "fa-brands fa-instagram",      url: "https://instagram.com" },
    { name: "facebook",   aliases: ["fb"],            icon: "fa-brands fa-facebook",       url: "https://facebook.com" },
    { name: "tiktok",     aliases: [],                icon: "fa-brands fa-tiktok",         url: "https://tiktok.com" },
    { name: "linkedin",   aliases: [],                icon: "fa-brands fa-linkedin",       url: "https://linkedin.com" },
    { name: "pinterest",  aliases: [],                icon: "fa-brands fa-pinterest",      url: "https://pinterest.com" },
    { name: "stackoverflow", aliases: ["so"],         icon: "fa-brands fa-stack-overflow", url: "https://stackoverflow.com" },
    { name: "whatsapp",   aliases: ["wa"],            icon: "fa-brands fa-whatsapp",       url: "https://web.whatsapp.com" },
    { name: "telegram",   aliases: ["tg"],            icon: "fa-brands fa-telegram",       url: "https://web.telegram.org" },
    { name: "steam",      aliases: [],                icon: "fa-brands fa-steam",          url: "https://store.steampowered.com" },
    { name: "imgur",      aliases: [],                icon: "fa-brands fa-imgur",          url: "https://imgur.com" },
    { name: "netflix",    aliases: [],                icon: "fa-solid fa-clapperboard",    url: "https://netflix.com" },
    { name: "protonmail", aliases: ["proton"],        icon: "fa-solid fa-shield-halved",   url: "https://mail.proton.me" },
  ];

  let matches = [];
  let activeIndex = -1;

  function scoreMatch(site, q) {
    const names = [site.name, ...(site.aliases || [])];
    let best = 0;
    names.forEach((n) => {
      if (n === q) best = Math.max(best, 100);
      else if (n.startsWith(q)) best = Math.max(best, 80);
      else if (n.includes(q)) best = Math.max(best, 40);
    });
    return best;
  }

  function findMatches(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    return SITES
      .map((s) => ({ site: s, score: scoreMatch(s, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.site);
  }

  function renderSuggestions() {
    if (matches.length === 0) {
      searchSuggest.hidden = true;
      searchSuggest.innerHTML = "";
      return;
    }
    searchSuggest.hidden = false;
    searchSuggest.innerHTML = "";
    matches.forEach((site, i) => {
      const item = document.createElement("div");
      item.className = "suggest-item" + (i === activeIndex ? " active" : "");
      item.innerHTML = `
        <i class="${site.icon}" aria-hidden="true"></i>
        <span class="suggest-name">${site.name}</span>
        <span class="suggest-url">${site.url.replace(/^https?:\/\//, "")}</span>`;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        goToSite(site);
      });
      searchSuggest.appendChild(item);
    });
  }

  function goToSite(site) {
    window.location.href = site.url;
  }

  function closeSuggestions() {
    matches = [];
    activeIndex = -1;
    searchSuggest.hidden = true;
    searchSuggest.innerHTML = "";
  }

  searchInput.addEventListener("input", () => {
    matches = findMatches(searchInput.value);
    activeIndex = -1;
    renderSuggestions();
  });

  searchInput.addEventListener("keydown", (e) => {
    if (searchSuggest.hidden || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, matches.length - 1);
      renderSuggestions();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      renderSuggestions();
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      goToSite(matches[activeIndex]);
    } else if (e.key === "Escape") {
      closeSuggestions();
    }
  });

  document.addEventListener("click", (e) => {
    if (!searchWrap.contains(e.target)) closeSuggestions();
  });

  /* ============================================================
     THREADS
     ============================================================ */

  function stripHtml(html) {
    if (!html) return "";
    const withBreaks = html.replace(/<br\s*\/?>/gi, " ");
    const tmp = document.createElement("div");
    tmp.innerHTML = withBreaks;
    return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
  }

  function renderBoardChips() {
    const wrap = document.getElementById("boardChips");
    wrap.innerHTML = "";
    const visibleBoards = ALL_BOARDS.filter(b => !b.nsfw || settings.nsfw);
    visibleBoards.forEach(b => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (activeBoards.includes(b.id) ? " active" : "");
      chip.textContent = b.label;
      chip.setAttribute("aria-pressed", activeBoards.includes(b.id));
      chip.addEventListener("click", () => {
        if (activeBoards.includes(b.id)) {
          activeBoards = activeBoards.filter(id => id !== b.id);
        } else {
          activeBoards = [...activeBoards, b.id];
        }
        store.set("vitrine.boards", activeBoards);
        renderBoardChips();
        loadThreads();
      });
      wrap.appendChild(chip);
    });
  }

  async function fetchBoardCatalog(board) {
    try {
      const res = await fetch(proxied(`https://a.4cdn.org/${board}/catalog.json`), { cache: "no-store" });
      if (!res.ok) return [];
      const pages = await res.json();
      const threads = [];
      pages.forEach(page => {
        (page.threads || []).forEach(t => threads.push({ ...t, board }));
      });
      return threads;
    } catch {
      return [];
    }
  }

  async function loadThreads() {
    const row = document.getElementById("threadsRow");
    const list = document.getElementById("threadsList");
    const meta = document.getElementById("threadsMeta");
    row.innerHTML = `
      <div class="thread-skeleton"></div>
      <div class="thread-skeleton"></div>
      <div class="thread-skeleton"></div>
      <div class="thread-skeleton"></div>`;
    list.innerHTML = "";
    meta.textContent = "fetching catalog…";

    if (activeBoards.length === 0) {
      row.innerHTML = `<p class="panel-foot" style="grid-column:1/-1;">no boards selected — pick some above.</p>`;
      meta.textContent = "0 boards selected";
      return;
    }

    const results = await Promise.all(activeBoards.map(fetchBoardCatalog));
    let all = results.flat().filter(t => !t.closed);

    all.sort((a, b) => (b.replies || 0) - (a.replies || 0));
    const top = all.slice(0, 4);
    // the rest fills the panel's remaining height as a compact ranked list
    // instead of leaving it empty — this is the real catalog, not just 4 cards.
    const rest = all.slice(4, 24);

    if (top.length === 0) {
      row.innerHTML = `<p class="panel-foot" style="grid-column:1/-1;">couldn't reach the catalog. try again shortly.</p>`;
      meta.textContent = "fetch failed";
      return;
    }

    row.innerHTML = "";
    top.forEach(t => row.appendChild(buildThreadCard(t)));

    list.innerHTML = "";
    rest.forEach((t, i) => list.appendChild(buildThreadListItem(t, i + 5)));

    const now = new Date();
    meta.textContent = `${top.length + rest.length} of ${all.length} threads · ${activeBoards.length} boards · updated ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  }

  function buildThreadListItem(t, rank) {
    const a = document.createElement("a");
    a.className = "thread-list-item";
    a.href = `https://boards.4chan.org/${t.board}/thread/${t.no}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.animationDelay = `${Math.min(rank - 5, 10) * 0.02}s`;

    const rankEl = document.createElement("span");
    rankEl.className = "thread-list-rank";
    rankEl.textContent = rank;

    const boardEl = document.createElement("span");
    boardEl.className = "thread-list-board";
    boardEl.textContent = `/${t.board}/`;

    const subjectEl = document.createElement("span");
    subjectEl.className = "thread-list-subject";
    subjectEl.textContent = stripHtml(t.sub) || stripHtml(t.com).slice(0, 90) || "untitled thread";

    const repliesEl = document.createElement("span");
    repliesEl.className = "thread-list-replies";
    repliesEl.textContent = `${t.replies || 0} replies`;

    a.appendChild(rankEl);
    a.appendChild(boardEl);
    a.appendChild(subjectEl);
    a.appendChild(repliesEl);
    return a;
  }

  function buildThreadCard(t) {
    const a = document.createElement("a");
    a.className = "thread-card";
    a.href = `https://boards.4chan.org/${t.board}/thread/${t.no}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "thread-thumb-wrap";

    if (t.tim && t.ext) {
      const isVideo = t.ext === ".webm" || t.ext === ".mp4";
      // full-resolution source for crisp cards; the 4chan "s.jpg" thumb is only
      // 250px and looks blurry once scaled up, so we only fall back to it for
      // video posts (which have no full-res still to show).
      const source = isVideo
        ? `https://i.4cdn.org/${t.board}/${t.tim}s.jpg`
        : `https://i.4cdn.org/${t.board}/${t.tim}${t.ext}`;

      const img = document.createElement("img");
      img.decoding = "async";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.src = proxied(source);
      img.addEventListener("error", () => {
        // if the full-res pull fails (huge png, rate limit, etc.) drop back to the thumb
        if (!isVideo && img.src !== proxied(`https://i.4cdn.org/${t.board}/${t.tim}s.jpg`)) {
          img.src = proxied(`https://i.4cdn.org/${t.board}/${t.tim}s.jpg`);
        }
      });
      thumbWrap.appendChild(img);
    }

    const boardTag = document.createElement("span");
    boardTag.className = "thread-board-tag";
    boardTag.textContent = `/${t.board}/`;
    thumbWrap.appendChild(boardTag);

    const replies = document.createElement("span");
    replies.className = "thread-replies";
    replies.textContent = `${t.replies || 0} replies`;
    thumbWrap.appendChild(replies);

    const body = document.createElement("div");
    body.className = "thread-body";

    const subjectText = stripHtml(t.sub) || stripHtml(t.com).slice(0, 60) || "untitled thread";
    const subject = document.createElement("p");
    subject.className = "thread-subject";
    subject.textContent = subjectText;

    const comment = document.createElement("p");
    comment.className = "thread-comment";
    comment.textContent = stripHtml(t.com).slice(0, 180);

    body.appendChild(subject);
    body.appendChild(comment);

    a.appendChild(thumbWrap);
    a.appendChild(body);
    return a;
  }

  document.getElementById("refreshThreads").addEventListener("click", loadThreads);

  function applyAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    if (settings.autoRefresh) {
      refreshTimer = setInterval(loadThreads, 5 * 60 * 1000);
    }
  }

  /* ============================================================
     QUICKLINKS
     ============================================================ */

  function faviconFor(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    } catch {
      return "";
    }
  }

  function renderLinks() {
    const grid = document.getElementById("quicklinksGrid");
    grid.innerHTML = "";
    links.forEach((link, i) => {
      const a = document.createElement("a");
      a.className = "quicklink";
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.animationDelay = `${i * 0.04}s`;

      const img = document.createElement("img");
      img.src = faviconFor(link.url);
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => { img.style.visibility = "hidden"; });

      const span = document.createElement("span");
      span.textContent = link.name;

      const remove = document.createElement("span");
      remove.className = "remove-x";
      remove.textContent = "×";
      remove.title = "remove";
      remove.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        links = links.filter((_, idx) => idx !== i);
        store.set("vitrine.links", links);
        renderLinks();
      });

      a.appendChild(img);
      a.appendChild(span);
      a.appendChild(remove);
      grid.appendChild(a);
    });
  }

  const addLinkBtn = document.getElementById("addLinkBtn");
  const addLinkForm = document.getElementById("addLinkForm");
  addLinkBtn.addEventListener("click", () => {
    addLinkForm.hidden = !addLinkForm.hidden;
    if (!addLinkForm.hidden) document.getElementById("linkName").focus();
  });
  document.getElementById("cancelLink").addEventListener("click", () => { addLinkForm.hidden = true; });

  addLinkForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("linkName");
    const urlInput = document.getElementById("linkUrl");
    let url = urlInput.value.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const name = nameInput.value.trim() || (() => { try { return new URL(url).hostname; } catch { return "link"; } })();

    links = [...links, { name, url }];
    store.set("vitrine.links", links);
    renderLinks();

    nameInput.value = "";
    urlInput.value = "";
    addLinkForm.hidden = true;
  });

  /* ============================================================
     SYSTEM TELEMETRY
     ============================================================ */

  function detectBrowser(ua) {
    const rules = [
      ["Edg/", "Edge"],
      ["OPR/", "Opera"],
      ["Firefox/", "Firefox"],
      ["Chrome/", "Chrome"],
      ["Version/", "Safari"],
    ];
    for (const [token, name] of rules) {
      const i = ua.indexOf(token);
      if (i !== -1) {
        const rest = ua.slice(i + token.length);
        const version = rest.split(/[\s);]/)[0];
        return `${name} ${version.split(".").slice(0, 2).join(".")}`;
      }
    }
    return "unknown";
  }

  function macMarketingName(major, minor) {
    const table = { 15: "Sequoia", 14: "Sonoma", 13: "Ventura", 12: "Monterey", 11: "Big Sur" };
    if (major === 10) {
      const legacy = { 15: "Catalina", 14: "Mojave", 13: "High Sierra", 12: "Sierra" };
      return legacy[minor] || "macOS";
    }
    return table[major] || "macOS";
  }

  function macDarwinKernel(major) {
    // approximate mapping of macOS major version -> Darwin kernel major
    const map = { 15: 24, 14: 23, 13: 22, 12: 21, 11: 20, 10: 19 };
    return map[major] ? `Darwin ${map[major]}.x` : "Darwin (unknown)";
  }

  function windowsName(ntVersion, platformVersionMajor) {
    // Chromium reports real build via getHighEntropyValues; ntVersion is UA fallback
    if (platformVersionMajor !== null) {
      return platformVersionMajor >= 13 ? "Windows 11" : "Windows 10";
    }
    const map = { "10.0": "Windows 10 / 11", "6.3": "Windows 8.1", "6.2": "Windows 8", "6.1": "Windows 7" };
    return map[ntVersion] || `Windows NT ${ntVersion}`;
  }

  async function detectOS(ua, platform) {
    // Chromium User-Agent Client Hints — most accurate path when available
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      try {
        const hv = await navigator.userAgentData.getHighEntropyValues([
          "platformVersion", "architecture", "bitness", "model"
        ]);
        const uaPlatform = navigator.userAgentData.platform;
        if (uaPlatform === "Windows") {
          const major = parseInt(hv.platformVersion.split(".")[0], 10);
          return {
            os: windowsName(null, major),
            kernel: `NT ${major >= 13 ? "10.0 (build ≥22000)" : "10.0"}`,
            arch: `${hv.architecture || "?"} ${hv.bitness || ""}`.trim(),
          };
        }
        if (uaPlatform === "macOS") {
          const parts = hv.platformVersion.split(".").map(Number);
          const major = 10 + (parts[0] || 0); // Chromium encodes macOS 11 as "11", 10.15 as "13" historically — best effort
          return {
            os: `macOS (${uaPlatform})`,
            kernel: "Darwin (see below)",
            arch: `${hv.architecture || "?"} ${hv.bitness || ""}`.trim(),
          };
        }
        if (uaPlatform === "Linux" || uaPlatform === "Chrome OS" || uaPlatform === "Android") {
          return {
            os: uaPlatform,
            kernel: uaPlatform === "Linux" ? "Linux (version not exposed by browser)" : uaPlatform,
            arch: `${hv.architecture || "?"} ${hv.bitness || ""}`.trim(),
          };
        }
      } catch { /* fall through to UA string parsing */ }
    }

    // fallback: classic UA sniffing
    if (/Windows NT ([\d.]+)/.test(ua)) {
      const nt = ua.match(/Windows NT ([\d.]+)/)[1];
      return { os: windowsName(nt, null), kernel: `NT ${nt}`, arch: platform };
    }
    if (/Mac OS X ([\d_]+)/.test(ua)) {
      const raw = ua.match(/Mac OS X ([\d_]+)/)[1];
      const [maj, min] = raw.split("_").map(Number);
      return {
        os: `macOS ${maj}.${min} “${macMarketingName(maj, min)}”`,
        kernel: macDarwinKernel(maj),
        arch: platform,
      };
    }
    if (/Android ([\d.]+)/.test(ua)) {
      const v = ua.match(/Android ([\d.]+)/)[1];
      return { os: `Android ${v}`, kernel: `Linux (Android ${v})`, arch: platform };
    }
    if (/Linux/.test(ua)) {
      return { os: "Linux", kernel: "Linux (version not exposed by browser)", arch: platform };
    }
    if (/iPhone|iPad/.test(ua)) {
      const v = (ua.match(/OS ([\d_]+)/) || [, "?"])[1].replace(/_/g, ".");
      return { os: `iOS ${v}`, kernel: `Darwin (iOS ${v})`, arch: platform };
    }
    return { os: platform || "unknown", kernel: "unknown", arch: platform || "unknown" };
  }

  // Rough, honest-about-being-a-guess load estimate: time a fixed chunk of
  // work and compare it against the fastest run this browser has ever seen
  // on this machine. Slower-than-usual means something else is busy.
  function estimateLoad() {
    const iterations = 1_500_000;
    const start = performance.now();
    let x = 0;
    for (let i = 0; i < iterations; i++) x += Math.sqrt(i);
    const elapsed = performance.now() - start;

    const baseline = store.get("vitrine.cpuBaseline", elapsed);
    const fastest = Math.min(baseline, elapsed);
    store.set("vitrine.cpuBaseline", fastest);

    const load = Math.max(0, Math.min(96, Math.round(((elapsed - fastest) / fastest) * 100)));
    return load;
  }

  function vibeLine(load, threads) {
    let mood;
    if (load < 12) mood = "barely awake";
    else if (load < 30) mood = "cruising along";
    else if (load < 55) mood = "working for it";
    else if (load < 80) mood = "getting warm";
    else mood = "sweating bullets";
    return `CPU sitting at ${load}% — ${mood}, ${threads || "a few"} threads on tap.`;
  }

  async function renderSysInfo() {
    const ua = navigator.userAgent;
    const platform = navigator.platform || "unknown";
    const grid = document.getElementById("sysInfoGrid");

    const { os, kernel, arch } = await detectOS(ua, platform);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = -new Date().getTimezoneOffset() / 60;
    const threads = navigator.hardwareConcurrency || null;
    const load = estimateLoad();

    const rows = [
      ["OS", os],
      ["Kernel", kernel],
      ["Architecture", arch || "n/a"],
      ["Browser", detectBrowser(ua)],
      ["CPU threads", threads ? `${threads} threads` : "n/a"],
      ["Timezone", `${tz} (UTC${offset >= 0 ? "+" : ""}${offset})`],
    ];

    grid.innerHTML = "";
    rows.forEach(([k, v]) => {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      grid.appendChild(dt);
      grid.appendChild(dd);
    });

    document.getElementById("machineVibe").textContent = vibeLine(load, threads);
    document.getElementById("sysBadge").textContent = `telemetry · ${os.split(" ")[0].toLowerCase()}`;
    document.getElementById("statusRight").textContent = `${os} · ${detectBrowser(ua)}`;
  }

  window.addEventListener("online", () => renderSysInfo());
  window.addEventListener("offline", () => renderSysInfo());

  /* ============================================================
     TOGGLES
     ============================================================ */

  function wireToggle(id, key, onChange) {
    const el = document.getElementById(id);
    const setState = (val) => {
      el.setAttribute("aria-checked", String(val));
    };
    setState(settings[key]);
    el.addEventListener("click", () => {
      settings[key] = !settings[key];
      setState(settings[key]);
      store.set("vitrine.settings", settings);
      if (onChange) onChange(settings[key]);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        el.click();
      }
    });
  }

  wireToggle("toggleAutoRefresh", "autoRefresh", applyAutoRefresh);
  wireToggle("toggleBlur", "blur", (val) => {
    document.body.dataset.blur = String(val);
  });
  wireToggle("toggleNSFW", "nsfw", () => {
    renderBoardChips();
    loadThreads();
  });

  document.body.dataset.blur = String(settings.blur);

  /* . boot . */

  renderBoardChips();
  renderLinks();
  loadThreads();
  renderSysInfo();
  applyAutoRefresh();
  setInterval(renderSysInfo, 60 * 1000);

})();
