/* ============================================================
   VITRINE — app.js
   Fully static / client-side. No backend, no build step.
   ============================================================ */

(() => {
  "use strict";

  /* ---------------- proxy ----------------
     4chan's API/CDN does not send CORS headers that satisfy every
     origin, so all reads (catalog JSON + every image) go through
     a small worker that mirrors the response with an open CORS header. */

  const PROXY = "https://chan-proxy.anonnousmes.workers.dev/?url=";
  const proxied = (url) => PROXY + encodeURIComponent(url);

  /* ---------------- storage helpers ---------------- */

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

  /* ---------------- defaults ---------------- */

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

  let refreshTimer = null;

  /* ---------------- clock ---------------- */

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

  /* ---------------- search ---------------- */

  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("searchInput").value.trim();
    if (!q) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
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
    const meta = document.getElementById("threadsMeta");
    row.innerHTML = `
      <div class="thread-skeleton"></div>
      <div class="thread-skeleton"></div>
      <div class="thread-skeleton"></div>
      <div class="thread-skeleton"></div>`;
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

    if (top.length === 0) {
      row.innerHTML = `<p class="panel-foot" style="grid-column:1/-1;">couldn't reach the catalog. try again shortly.</p>`;
      meta.textContent = "fetch failed";
      return;
    }

    row.innerHTML = "";
    top.forEach(t => row.appendChild(buildThreadCard(t)));

    const now = new Date();
    meta.textContent = `${top.length} of ${activeBoards.length} boards · updated ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
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

  function getWebGLRenderer() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return null;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (!ext) return gl.getParameter(gl.RENDERER);
      return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    } catch {
      return null;
    }
  }

  function getBattery() {
    return new Promise((resolve) => {
      if (navigator.getBattery) {
        navigator.getBattery().then(b => {
          resolve(`${Math.round(b.level * 100)}%${b.charging ? " ⚡" : ""}`);
        }).catch(() => resolve(null));
      } else {
        resolve(null);
      }
    });
  }

  async function renderSysInfo() {
    const ua = navigator.userAgent;
    const platform = navigator.platform || "unknown";
    const grid = document.getElementById("sysInfoGrid");

    const [{ os, kernel, arch }, battery] = await Promise.all([detectOS(ua, platform), getBattery()]);

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const gpu = getWebGLRenderer();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = -new Date().getTimezoneOffset() / 60;

    const rows = [
      ["OS", os],
      ["Kernel", kernel],
      ["Architecture", arch || "n/a"],
      ["Browser", detectBrowser(ua)],
      ["CPU threads", navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} threads` : "n/a"],
      ["Memory (approx)", navigator.deviceMemory ? `${navigator.deviceMemory} GB+` : "n/a"],
      ["GPU", gpu ? gpu.slice(0, 34) : "masked / n/a"],
      ["Screen", `${screen.width}×${screen.height} @${window.devicePixelRatio}x`],
      ["Color depth", `${screen.colorDepth}-bit`],
      ["Viewport", `${window.innerWidth}×${window.innerHeight}`],
      ["Timezone", `${tz} (UTC${offset >= 0 ? "+" : ""}${offset})`],
      ["Language", navigator.languages ? navigator.languages.slice(0, 2).join(", ") : navigator.language],
      ["Network", conn ? `${conn.effectiveType || "?"}${conn.downlink ? " · " + conn.downlink + "Mb/s" : ""}` : "n/a"],
      ["Battery", battery || "n/a"],
      ["Touch points", navigator.maxTouchPoints ?? 0],
      ["Cookies", navigator.cookieEnabled ? "enabled" : "disabled"],
      ["Online", navigator.onLine ? "yes" : "no"],
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

  /* ---------------- boot ---------------- */

  renderBoardChips();
  renderLinks();
  loadThreads();
  renderSysInfo();
  applyAutoRefresh();
  setInterval(renderSysInfo, 60 * 1000);

})();
