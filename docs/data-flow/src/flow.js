// Data-flow viewer. Three lanes — Client (surfaces) → Supabase (operations,
// grouped by module) → Tables — plus a detail panel. No canvas/engine: plain
// DOM + class toggles for highlighting. Buildless (window globals, file://).
//
// Interactions:
//   * Click an operation  → highlight its surface + the tables it writes, and
//     render its RPC signature / guard / triggers / downstream in the panel.
//   * Click a table       → highlight every operation that writes it (the
//     cross-link: table → operations, and the panel lists them back).
//   * ?table=<name> in the URL preselects a table (deep-link from the ER viewer).
(function () {
  "use strict";

  var F = window.__FLOWS__;
  var surfacesEl = document.getElementById("surfaces");
  var opsEl = document.getElementById("ops");
  var tablesEl = document.getElementById("tables");
  var detailEl = document.getElementById("detail");
  var metaEl = document.getElementById("meta");
  var searchEl = document.getElementById("search");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  if (!F || !Array.isArray(F.operations) || F.operations.length === 0) {
    document.getElementById("main").style.display = "none";
    document.getElementById("empty").style.display = "flex";
    return;
  }

  var ops = F.operations;
  var liveCount = ops.filter(function (o) {
    return o.status === "live";
  }).length;
  metaEl.textContent =
    "generated " +
    (F.generated_at || "?") +
    " · " +
    ops.length +
    " operations (" +
    liveCount +
    " live · " +
    (ops.length - liveCount) +
    " planned)";

  // ---- Indexes --------------------------------------------------------------
  var opById = {};
  var tableToOps = {}; // table -> [opId] (writers)
  var allTables = {};
  ops.forEach(function (o) {
    opById[o.id] = o;
    (o.writes || []).forEach(function (t) {
      allTables[t] = true;
      (tableToOps[t] = tableToOps[t] || []).push(o.id);
    });
    (o.reads || []).forEach(function (t) {
      allTables[t] = true;
    });
  });
  var tableNames = Object.keys(allTables).sort();

  // ---- Surfaces lane --------------------------------------------------------
  var surfaceEls = {};
  Object.keys(F.surfaces).forEach(function (key) {
    var el = document.createElement("div");
    el.className = "lane-item surface s-" + key;
    el.textContent = F.surfaces[key];
    surfacesEl.appendChild(el);
    surfaceEls[key] = el;
  });

  // ---- Operations lane (grouped by module) ----------------------------------
  var opEls = {};
  Object.keys(F.modules).forEach(function (mkey) {
    var group = ops.filter(function (o) {
      return o.module === mkey;
    });
    if (!group.length) return;
    var h = document.createElement("div");
    h.className = "op-group-label";
    h.textContent = F.modules[mkey];
    opsEl.appendChild(h);
    group.forEach(function (o) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "op s-" + o.surface + (o.status === "planned" ? " planned" : "");
      el.setAttribute("aria-pressed", "false");
      el.innerHTML =
        '<span class="op-name">' +
        esc(o.label) +
        "</span>" +
        '<span class="op-rpc">' +
        esc(o.rpc || "direct DML") +
        "</span>" +
        (o.status === "planned" ? '<span class="badge planned">planned</span>' : "");
      el.addEventListener("click", function () {
        selectOp(o.id);
      });
      opsEl.appendChild(el);
      opEls[o.id] = el;
    });
  });

  // ---- Tables lane ----------------------------------------------------------
  var tableEls = {};
  tableNames.forEach(function (name) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "lane-item table";
    el.textContent = name;
    el.setAttribute("aria-pressed", "false");
    el.addEventListener("click", function () {
      selectTable(name);
    });
    tablesEl.appendChild(el);
    tableEls[name] = el;
  });

  // ---- Highlight helpers ----------------------------------------------------
  function clearHighlights() {
    Object.keys(opEls).forEach(function (id) {
      opEls[id].classList.remove("active", "related");
      opEls[id].setAttribute("aria-pressed", "false");
    });
    Object.keys(tableEls).forEach(function (n) {
      tableEls[n].classList.remove("active", "related");
      tableEls[n].setAttribute("aria-pressed", "false");
    });
    Object.keys(surfaceEls).forEach(function (k) {
      surfaceEls[k].classList.remove("active");
    });
  }

  function selectOp(id) {
    var o = opById[id];
    if (!o) return;
    clearHighlights();
    opEls[id].classList.add("active");
    opEls[id].setAttribute("aria-pressed", "true");
    if (surfaceEls[o.surface]) surfaceEls[o.surface].classList.add("active");
    (o.writes || []).concat(o.reads || []).forEach(function (t) {
      if (tableEls[t]) tableEls[t].classList.add("related");
    });
    renderOpDetail(o);
  }

  function selectTable(name) {
    clearHighlights();
    tableEls[name].classList.add("active");
    tableEls[name].setAttribute("aria-pressed", "true");
    var writers = tableToOps[name] || [];
    writers.forEach(function (id) {
      if (opEls[id]) opEls[id].classList.add("related");
    });
    renderTableDetail(name, writers);
  }

  // ---- Detail panel ---------------------------------------------------------
  function list(title, arr) {
    if (!arr || !arr.length) return "";
    return (
      "<h3>" +
      esc(title) +
      "</h3><div class='chips'>" +
      arr
        .map(function (x) {
          return "<code>" + esc(x) + "</code>";
        })
        .join("") +
      "</div>"
    );
  }

  function renderOpDetail(o) {
    var html = "<h2>" + esc(o.label) + "</h2>";
    html +=
      "<div class='sub'>" +
      esc(F.modules[o.module] || o.module) +
      " · " +
      esc(F.surfaces[o.surface] || o.surface) +
      (o.status === "planned" ? " · <span class='badge planned'>planned</span>" : "") +
      "</div>";
    html += "<h3>Signature</h3><pre class='sig'>" + esc(o.signature) + "</pre>";
    html += "<div class='kv'><span>Security</span><code>" + esc(o.security) + "</code></div>";
    html += "<div class='kv'><span>Guard</span><code>" + esc(o.guard) + "</code></div>";
    html += list("Writes", o.writes);
    html += list("Reads", o.reads);
    html += list("Triggers fired", o.triggers);
    html += "<h3>Downstream</h3><p class='desc'>" + esc(o.downstream) + "</p>";
    html += "<div class='src'>source: <code>" + esc(o.source) + "</code></div>";
    detailEl.innerHTML = html;
  }

  function renderTableDetail(name, writers) {
    var html = "<h2>" + esc(name) + "</h2>";
    html +=
      "<div class='sub'>" +
      (writers.length
        ? writers.length + " operation(s) write this table"
        : "no writers (read-only here)") +
      "</div>";
    if (writers.length) {
      html += "<h3>Written by</h3>";
      writers.forEach(function (id) {
        var o = opById[id];
        html +=
          "<button type='button' class='rel-op' data-op='" +
          esc(id) +
          "'>" +
          esc(o.label) +
          "<span class='op-rpc'>" +
          esc(o.rpc || "direct DML") +
          "</span></button>";
      });
    }
    detailEl.innerHTML = html;
    // Back-link: clicking a writer jumps to that operation.
    Array.prototype.forEach.call(detailEl.querySelectorAll(".rel-op"), function (b) {
      b.addEventListener("click", function () {
        selectOp(b.getAttribute("data-op"));
      });
    });
  }

  // ---- Search ---------------------------------------------------------------
  if (searchEl) {
    searchEl.addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      Object.keys(opEls).forEach(function (id) {
        var o = opById[id];
        var hit =
          !q ||
          o.label.toLowerCase().indexOf(q) >= 0 ||
          (o.rpc || "").toLowerCase().indexOf(q) >= 0 ||
          (o.writes || []).join(" ").toLowerCase().indexOf(q) >= 0;
        opEls[id].style.display = hit ? "" : "none";
      });
      Object.keys(tableEls).forEach(function (n) {
        tableEls[n].style.display = !q || n.toLowerCase().indexOf(q) >= 0 ? "" : "none";
      });
    });
  }

  // ---- Deep-link from the ER viewer: ?table=<name> --------------------------
  var params = new URLSearchParams(window.location.search);
  var deepTable = params.get("table");
  if (deepTable && tableEls[deepTable]) {
    selectTable(deepTable);
    tableEls[deepTable].scrollIntoView({ block: "center" });
  }
})();
