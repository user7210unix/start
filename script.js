/* ============================================================
   start — folder logic, storage and the old-fashioned animations
   ============================================================ */
(function () {
  "use strict";

  var KEY = "start.shelf.v1";
  var ICON = { folder: "assets/icons/folder.png", page: "assets/icons/page.svg" };

  /* Sites load in this tab, the way a start page should. Flip to true if you
     would rather every bookmark spawn a new one. Ctrl / Cmd / Shift / middle
     click always opens a new tab regardless. */
  var OPEN_IN_NEW_TAB = false;

  var SEED = [
    { name: "search", items: [
      { name: "duckduckgo", url: "https://duckduckgo.com" },
      { name: "yandex", url: "https://yandex.com" },
      { name: "wikipedia", url: "https://wikipedia.org" }
    ]},
    { name: "boards", items: [
      { name: "/g/", url: "https://boards.4chan.org/g/" },
      { name: "/v/", url: "https://boards.4chan.org/v/" },
      { name: "/b/", url: "https://boards.4chan.org/b/" },
      { name: "desuarchive", url: "https://desuarchive.org" }
    ]},
    { name: "media", items: [
      { name: "youtube", url: "https://www.youtube.com" },
      { name: "catbox", url: "https://catbox.moe" }
    ]},
    { name: "docs", items: [
      { name: "arch wiki", url: "https://wiki.archlinux.org" },
      { name: "github", url: "https://github.com" }
    ]},
    { name: "mail", items: [
      { name: "proton", url: "https://mail.proton.me/u/0/inbox" }
    ]}
  ];

  /* ------------------------------------------------------------- dom */

  var $ = function (id) { return document.getElementById(id); };
  var shell = $("shell"), grid = $("grid"), pane = $("pane"), crumbs = $("crumbs");
  var upBtn = $("up"), countEl = $("count"), targetEl = $("target");
  var renameBtn = $("rename"), removeBtn = $("remove"), titleEl = $("windowTitle");
  var scrim = $("scrim");

  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --------------------------------------------------------- storage */

  var data, here = null, picked = null;

  function uid() {
    return "x" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.length) return parsed;
      }
    } catch (e) { /* private mode, file://, whatever — fall through */ }
    return SEED.map(function (f) {
      return {
        id: uid(), name: f.name,
        items: f.items.map(function (s) { return { id: uid(), name: s.name, url: s.url }; })
      };
    });
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function folder(id) {
    for (var i = 0; i < data.length; i++) if (data[i].id === id) return data[i];
    return null;
  }

  /* ----------------------------------------------------------- paint */

  function listing() {
    return here ? (folder(here) || { items: [] }).items : data;
  }

  function render(stagger) {
    var rows = listing();
    var inFolder = !!here;

    grid.textContent = "";
    if (!rows.length) {
      var blank = document.createElement("p");
      blank.className = "empty";
      blank.textContent = inFolder
        ? "Nothing filed here yet. Add a site below."
        : "No folders yet. Make one below.";
      grid.appendChild(blank);
    }

    rows.forEach(function (row, i) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "item";
      el.dataset.id = row.id;
      el.dataset.kind = inFolder ? "site" : "folder";
      if (stagger !== false) el.style.setProperty("--i", i);
      else el.style.animation = "none";

      var img = document.createElement("img");
      img.className = "tint";
      img.src = inFolder ? ICON.page : ICON.folder;
      img.alt = "";
      img.draggable = false;

      var label = document.createElement("span");
      label.className = "label";
      label.textContent = row.name;

      el.appendChild(img);
      el.appendChild(label);
      el.title = inFolder ? row.url : row.items.length + " sites";
      grid.appendChild(el);
    });

    var f = here ? folder(here) : null;
    titleEl.textContent = f ? f.name : "start";
    upBtn.disabled = !inFolder;

    crumbs.textContent = "";
    var home = document.createElement(inFolder ? "a" : "b");
    home.textContent = "start";
    if (inFolder) {
      home.href = "#";
      home.style.color = "inherit";
      home.onclick = function (e) { e.preventDefault(); goUp(); };
    }
    crumbs.appendChild(home);
    if (f) {
      var sep = document.createElement("span");
      sep.className = "sep";
      sep.textContent = " \u25B8 ";
      var leaf = document.createElement("b");
      leaf.textContent = f.name;
      crumbs.appendChild(sep);
      crumbs.appendChild(leaf);
    }

    countEl.textContent = rows.length + (rows.length === 1 ? " item" : " items");
    select(null);
  }

  function select(id) {
    picked = id;
    var rows = listing(), row = null;
    Array.prototype.forEach.call(grid.children, function (el) {
      if (!el.dataset) return;
      el.classList.toggle("is-selected", el.dataset.id === id);
    });
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) row = rows[i];

    renameBtn.disabled = removeBtn.disabled = !row;
    renameBtn.textContent = row && here ? "Edit" : "Rename";
    targetEl.textContent = row ? (here ? row.url : row.items.length + " sites filed") : "";
  }

  /* ------------------------------------------------- old-school FX */

  function boxOf(el) {
    var r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }

  function zoomRects(from, to, then) {
    if (still) { then(); return; }
    var frames = [
      { left: from.left + "px", top: from.top + "px",
        width: from.width + "px", height: from.height + "px", opacity: 1 },
      { left: to.left + "px", top: to.top + "px",
        width: to.width + "px", height: to.height + "px", opacity: 0 }
    ];
    for (var k = 0; k < 3; k++) {
      var d = document.createElement("div");
      d.className = "zoomer";
      document.body.appendChild(d);
      var a = d.animate(frames, {
        duration: 200, delay: k * 42, easing: "steps(6, end)", fill: "both"
      });
      a.onfinish = (function (node) { return function () { node.remove(); }; })(d);
    }
    setTimeout(then, 105);
  }

  function blink(el, then) {
    if (still || !el) { then && then(); return; }
    el.classList.add("is-opening");
    setTimeout(function () {
      el.classList.remove("is-opening");
      then && then();
    }, 170);
  }

  function poof(x, y) {
    if (still) return;
    var p = document.createElement("div");
    p.className = "poof";
    p.style.left = x + "px";
    p.style.top = y + "px";
    document.body.appendChild(p);
    setTimeout(function () { p.remove(); }, 400);
  }

  /* ------------------------------------------------------ navigation */

  function openItem(el, ev) {
    var id = el.dataset.id;
    if (el.dataset.kind === "folder") {
      blink(el, function () {
        zoomRects(boxOf(el), boxOf(pane), function () {
          here = id;
          render();
          pane.scrollTop = 0;
        });
      });
      return;
    }

    var rows = listing(), url = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) url = rows[i].url;
    if (!url) return;

    var aside = OPEN_IN_NEW_TAB ||
      (ev && (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button === 1));

    if (aside) {
      window.open(url, "_blank", "noopener");   /* stays inside the gesture */
      blink(el);
    } else {
      blink(el, function () { window.location.href = url; });
    }
  }

  function goUp() {
    if (!here) return;
    var leaving = here;
    var anchor = null;
    here = null;
    render();
    Array.prototype.forEach.call(grid.children, function (el) {
      if (el.dataset && el.dataset.id === leaving) anchor = el;
    });
    if (anchor) zoomRects(boxOf(pane), boxOf(anchor), function () {});
    select(leaving);
  }

  /* --------------------------------------------------------- dialogs */

  var lastFocus = null;

  function closeDialog() {
    scrim.hidden = true;
    scrim.textContent = "";
    if (lastFocus) lastFocus.focus();
  }

  function dialog(opts) {
    lastFocus = document.activeElement;
    scrim.textContent = "";
    scrim.hidden = false;

    var box = document.createElement("div");
    box.className = "dialog";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", opts.title);

    var bar = document.createElement("div");
    bar.className = "titlebar";
    bar.innerHTML = '<span class="rule"></span><span class="title"></span><span class="rule"></span>';
    bar.querySelector(".title").textContent = opts.title;

    var form = document.createElement("form");
    var body = document.createElement("div");
    body.className = "body";

    if (opts.note) {
      var note = document.createElement("p");
      note.className = "note";
      note.textContent = opts.note;
      body.appendChild(note);
    }

    var inputs = {};
    (opts.fields || []).forEach(function (f, i) {
      var row = document.createElement("div");
      row.className = "row";
      var lab = document.createElement("label");
      lab.textContent = f.label;
      lab.htmlFor = "fld" + i;
      var inp = document.createElement("input");
      inp.className = "field";
      inp.id = "fld" + i;
      inp.value = f.value || "";
      inp.placeholder = f.placeholder || "";
      inp.autocomplete = "off";
      inp.spellcheck = false;
      row.appendChild(lab);
      row.appendChild(inp);
      body.appendChild(row);
      inputs[f.key] = inp;
    });

    var foot = document.createElement("div");
    foot.className = "foot";
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn";
    cancel.textContent = "Cancel";
    var ok = document.createElement("button");
    ok.type = "submit";
    ok.className = "btn is-default";
    ok.textContent = opts.confirm;
    foot.appendChild(cancel);
    foot.appendChild(ok);

    form.appendChild(body);
    form.appendChild(foot);
    box.appendChild(bar);
    box.appendChild(form);
    scrim.appendChild(box);

    cancel.onclick = closeDialog;
    form.onsubmit = function (e) {
      e.preventDefault();
      var vals = {};
      for (var k in inputs) vals[k] = inputs[k].value;
      if (opts.onConfirm(vals, inputs) !== false) closeDialog();
    };

    var first = box.querySelector(".field") || ok;
    setTimeout(function () { first.focus(); first.select && first.select(); }, still ? 0 : 200);
  }

  function bad(input) {
    input.setAttribute("aria-invalid", "true");
    input.focus();
    input.oninput = function () { input.removeAttribute("aria-invalid"); };
    return false;
  }

  function tidyUrl(v) {
    v = (v || "").trim();
    if (!v) return null;
    if (!/^[a-z][a-z0-9+.\-]*:/i.test(v)) v = "https://" + v;
    try {
      var u = new URL(v);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch (e) {}
    return null;
  }

  /* --------------------------------------------------------- actions */

  $("addFolder").onclick = function () {
    dialog({
      title: "New folder",
      confirm: "Create",
      fields: [{ key: "name", label: "Folder name", placeholder: "reading" }],
      onConfirm: function (v, inp) {
        var name = v.name.trim();
        if (!name) return bad(inp.name);
        var made = { id: uid(), name: name, items: [] };
        data.push(made);
        save();
        here = null;
        render();
        select(made.id);
      }
    });
  };

  $("addSite").onclick = function () {
    if (!here && !data.length) {
      dialog({
        title: "New site", confirm: "OK", fields: [],
        note: "Sites live inside folders. Make a folder first.",
        onConfirm: function () {}
      });
      return;
    }
    var target = here || (picked && !here ? picked : data[0].id);
    dialog({
      title: "New site",
      confirm: "Create",
      note: here ? null : "Filing into " + folder(target).name + ".",
      fields: [
        { key: "name", label: "Name", placeholder: "desuarchive" },
        { key: "url", label: "Address", placeholder: "desuarchive.org" }
      ],
      onConfirm: function (v, inp) {
        var name = v.name.trim();
        var url = tidyUrl(v.url);
        if (!name) return bad(inp.name);
        if (!url) return bad(inp.url);
        folder(target).items.push({ id: uid(), name: name, url: url });
        save();
        here = target;
        render();
      }
    });
  };

  renameBtn.onclick = function () {
    if (!picked) return;
    var rows = listing(), row = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].id === picked) row = rows[i];
    if (!row) return;

    if (here) {
      dialog({
        title: "Edit site",
        confirm: "Save",
        fields: [
          { key: "name", label: "Name", value: row.name },
          { key: "url", label: "Address", value: row.url }
        ],
        onConfirm: function (v, inp) {
          var name = v.name.trim(), url = tidyUrl(v.url);
          if (!name) return bad(inp.name);
          if (!url) return bad(inp.url);
          row.name = name;
          row.url = url;
          save();
          render(false);
          select(row.id);
        }
      });
    } else {
      dialog({
        title: "Rename folder",
        confirm: "Save",
        fields: [{ key: "name", label: "Folder name", value: row.name }],
        onConfirm: function (v, inp) {
          var name = v.name.trim();
          if (!name) return bad(inp.name);
          row.name = name;
          save();
          render(false);
          select(row.id);
        }
      });
    }
  };

  removeBtn.onclick = function () {
    if (!picked) return;
    var rows = listing(), row = null, idx = -1;
    for (var i = 0; i < rows.length; i++) if (rows[i].id === picked) { row = rows[i]; idx = i; }
    if (!row) return;

    var note = here
      ? "Delete " + row.name + "?"
      : "Delete the folder " + row.name + " and the " + row.items.length +
        (row.items.length === 1 ? " site" : " sites") + " inside it?";

    dialog({
      title: "Delete",
      confirm: "Delete",
      note: note,
      fields: [],
      onConfirm: function () {
        var el = grid.querySelector('[data-id="' + row.id + '"]');
        if (el) {
          var b = boxOf(el);
          poof(b.left + b.width / 2, b.top + b.height / 2);
        }
        rows.splice(idx, 1);
        save();
        setTimeout(function () { render(false); }, still ? 0 : 130);
      }
    });
  };

  /* ---------------------------------------------------------- events */

  grid.addEventListener("click", function (e) {
    var el = e.target.closest(".item");
    if (!el) { select(null); return; }
    if (coarse || el.dataset.id === picked) { openItem(el, e); return; }
    select(el.dataset.id);
  });

  grid.addEventListener("dblclick", function (e) {
    var el = e.target.closest(".item");
    if (el) openItem(el, e);
  });

  grid.addEventListener("auxclick", function (e) {
    var el = e.target.closest(".item");
    if (el && e.button === 1) { e.preventDefault(); openItem(el, e); }
  });

  pane.addEventListener("mousedown", function (e) {
    if (!e.target.closest(".item")) select(null);
  });

  grid.addEventListener("mouseover", function (e) {
    var el = e.target.closest(".item");
    if (el) targetEl.textContent = el.title;
  });
  grid.addEventListener("mouseleave", function () {
    select(picked);
  });

  upBtn.onclick = goUp;

  document.addEventListener("keydown", function (e) {
    if (!scrim.hidden) {
      if (e.key === "Escape") closeDialog();
      return;
    }
    var items = Array.prototype.filter.call(grid.children, function (n) { return n.dataset && n.dataset.id; });
    var at = -1;
    items.forEach(function (n, i) { if (n.dataset.id === picked) at = i; });

    var cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length || 1;
    var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];

    if (step) {
      e.preventDefault();
      var next = at < 0 ? 0 : Math.max(0, Math.min(items.length - 1, at + step));
      if (items[next]) { select(items[next].dataset.id); items[next].focus(); }
      return;
    }
    if (e.key === "Enter" && picked) {
      e.preventDefault();
      var el = grid.querySelector('[data-id="' + picked + '"]');
      if (el) openItem(el);
    }
    if ((e.key === "Backspace" || e.key === "Escape") && here) {
      e.preventDefault();
      goUp();
      return;
    }
    if (e.key === "Delete" && picked) removeBtn.click();
  });

  scrim.addEventListener("mousedown", function (e) {
    if (e.target === scrim) closeDialog();
  });

  /* ------------------------------------------- window chrome & drag */

  var bar = $("titlebar");

  bar.addEventListener("click", function (e) {
    var b = e.target.closest(".box");
    if (!b) return;
    if (b.dataset.act === "shade") shell.classList.toggle("is-shaded");
    if (b.dataset.act === "zoom") shell.classList.toggle("is-wide");
  });

  bar.addEventListener("dblclick", function (e) {
    if (e.target.closest(".box")) return;
    shell.classList.toggle("is-shaded");
  });

  if (!coarse) {
    var dragging = false, ox = 0, oy = 0, px = 0, py = 0;
    bar.addEventListener("mousedown", function (e) {
      if (e.target.closest(".box")) return;
      dragging = true;
      ox = e.clientX - px;
      oy = e.clientY - py;
      e.preventDefault();
    });
    window.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      px = e.clientX - ox;
      py = e.clientY - oy;
      var r = shell.getBoundingClientRect();
      var maxX = window.innerWidth / 2 + r.width / 2 - 60;
      var maxY = window.innerHeight / 2 + r.height / 2 - 30;
      px = Math.max(-maxX, Math.min(maxX, px));
      py = Math.max(-window.innerHeight / 2 + 20, Math.min(maxY, py));
      shell.style.transform = "translate(" + px + "px," + py + "px)";
    });
    window.addEventListener("mouseup", function () { dragging = false; });
  }

  /* ------------------------------------------------------------ boot */

  data = load();
  render();
})();
