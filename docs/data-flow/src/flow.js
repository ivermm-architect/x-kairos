// Data-flow viewer — drill-down navigator + per-process flow graph.
//
// Left sidebar groups processes as  User (role) ▸ Module ▸ Process. Picking a
// process ISOLATES its flow on the canvas: just that process and arrows to the
// tables it writes (solid) + triggers it fires (dashed), laid out left→right.
// This avoids the "everything at once" hairball; "Show all" restores the full
// grouped overview. Clicking a table isolates the processes that write it.
//
// Buildless (window globals, file://); same engine as the ER viewer.
(function () {
  "use strict";

  var F = window.__FLOWS__;
  var cyEl = document.getElementById("cy");
  var detailEl = document.getElementById("detail");
  var metaEl = document.getElementById("meta");
  var navEl = document.getElementById("nav");

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

  // ---- Palette / tokens -----------------------------------------------------
  var C = {
    panel: "#161b22",
    border: "#30363d",
    text: "#e6edf3",
    accent: "#58a6ff",
    table: "#79c0ff",
    trigger: "#db61a2",
  };
  var SURF_ORDER = ["pos", "admin", "storefront"];
  var SURF_COLOR = { pos: "#7ee787", admin: "#d2a8ff", storefront: "#ffa657" };
  var PLACEHOLDER = detailEl.innerHTML;

  var ops = F.operations;
  var opById = {};
  ops.forEach(function (o) {
    opById[o.id] = o;
  });

  var liveCount = ops.filter(function (o) {
    return o.status === "live";
  }).length;
  metaEl.textContent =
    "generated " +
    (F.generated_at || "?") +
    " · " +
    ops.length +
    " processes (" +
    liveCount +
    " live · " +
    (ops.length - liveCount) +
    " planned)";

  function width(label) {
    return Math.max(96, label.length * 7.3 + 26);
  }
  function slug(s) {
    return s.replace(/[^a-zA-Z0-9]+/g, "_");
  }

  // ---- Build graph elements -------------------------------------------------
  var elements = [];
  var tableSeen = {};
  var trigSeen = {};
  var PROC_X = 0,
    TABLE_X = 760,
    TRIG_X = 1180;
  var ROW = 64,
    MOD_GAP = 30,
    USER_GAP = 70;
  var y = 0;

  SURF_ORDER.forEach(function (surface) {
    var surfOps = ops.filter(function (o) {
      return o.surface === surface;
    });
    if (!surfOps.length) return;
    var uid = "u_" + surface;
    elements.push({
      data: { id: uid, label: F.surfaces[surface], kind: "user", color: SURF_COLOR[surface] },
    });
    Object.keys(F.modules).forEach(function (mkey) {
      var group = surfOps.filter(function (o) {
        return o.module === mkey;
      });
      if (!group.length) return;
      var mid = "m_" + surface + "_" + mkey;
      elements.push({
        data: {
          id: mid,
          parent: uid,
          label: F.modules[mkey],
          kind: "module",
          color: SURF_COLOR[surface],
        },
      });
      group.forEach(function (o) {
        elements.push({
          data: {
            id: "op_" + o.id,
            parent: mid,
            label: o.label,
            kind: "op",
            color: SURF_COLOR[surface],
            planned: o.status === "planned" ? 1 : 0,
            w: width(o.label),
          },
          position: { x: PROC_X, y: y },
        });
        y += ROW;
      });
      y += MOD_GAP;
    });
    y += USER_GAP;
  });

  var ty = 0,
    gy = 0;
  ops.forEach(function (o) {
    (o.writes || []).forEach(function (t) {
      if (!tableSeen[t]) {
        tableSeen[t] = 1;
        elements.push({
          data: { id: "tbl_" + t, label: t, kind: "table", w: width(t) },
          position: { x: TABLE_X, y: ty },
        });
        ty += ROW;
      }
      elements.push({
        data: {
          id: "w_" + o.id + "_" + t,
          source: "op_" + o.id,
          target: "tbl_" + t,
          kind: "write",
        },
      });
    });
    (o.triggers || []).forEach(function (tr) {
      var id = "trg_" + slug(tr);
      if (!trigSeen[id]) {
        trigSeen[id] = 1;
        elements.push({
          data: { id: id, label: tr, kind: "trigger", w: width(tr) },
          position: { x: TRIG_X, y: gy },
        });
        gy += ROW;
      }
      elements.push({
        data: { id: "t_" + o.id + "_" + slug(tr), source: "op_" + o.id, target: id, kind: "fire" },
      });
    });
  });

  // ---- Cytoscape ------------------------------------------------------------
  var cy = cytoscape({
    container: cyEl,
    elements: elements,
    wheelSensitivity: 0.2,
    style: [
      {
        selector: "node[kind='user']",
        style: {
          shape: "round-rectangle",
          "background-color": "data(color)",
          "background-opacity": 0.04,
          "border-width": 2,
          "border-color": "data(color)",
          "border-opacity": 0.5,
          label: "data(label)",
          color: "data(color)",
          "text-valign": "top",
          "text-halign": "left",
          "text-margin-x": 6,
          "text-margin-y": -6,
          "font-size": 16,
          "font-weight": 700,
          padding: "26px",
        },
      },
      {
        selector: "node[kind='module']",
        style: {
          shape: "round-rectangle",
          "background-color": "data(color)",
          "background-opacity": 0.07,
          "border-width": 1,
          "border-color": "data(color)",
          "border-opacity": 0.4,
          "border-style": "dashed",
          label: "data(label)",
          color: "data(color)",
          "text-valign": "top",
          "text-halign": "left",
          "text-margin-x": 4,
          "text-margin-y": -4,
          "font-size": 11,
          "font-weight": 700,
          "text-transform": "uppercase",
          padding: "16px",
        },
      },
      {
        selector: "node[kind='op']",
        style: {
          shape: "round-rectangle",
          width: "data(w)",
          height: 34,
          "background-color": C.panel,
          "border-width": 2,
          "border-color": "data(color)",
          label: "data(label)",
          color: C.text,
          "text-valign": "center",
          "text-halign": "center",
          "font-size": 11,
          "font-weight": 600,
        },
      },
      {
        selector: "node[kind='op'][planned = 1]",
        style: { "border-style": "dashed", opacity: 0.7 },
      },
      {
        selector: "node[kind='table']",
        style: {
          shape: "round-rectangle",
          width: "data(w)",
          height: 30,
          "background-color": "#0f2230",
          "border-width": 1,
          "border-color": C.table,
          label: "data(label)",
          color: C.table,
          "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
          "font-size": 11,
          "text-valign": "center",
          "text-halign": "center",
        },
      },
      {
        selector: "node[kind='trigger']",
        style: {
          shape: "round-rectangle",
          width: "data(w)",
          height: 28,
          "background-color": "#2b1020",
          "border-width": 1,
          "border-color": C.trigger,
          label: "data(label)",
          color: C.trigger,
          "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
          "font-size": 10,
          "text-valign": "center",
          "text-halign": "center",
        },
      },
      {
        selector: "edge[kind='write']",
        style: {
          width: 1.6,
          "line-color": C.accent,
          "target-arrow-color": C.accent,
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "arrow-scale": 0.9,
        },
      },
      {
        selector: "edge[kind='fire']",
        style: {
          width: 1.3,
          "line-color": C.trigger,
          "line-style": "dashed",
          "target-arrow-color": C.trigger,
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "arrow-scale": 0.8,
        },
      },
    ],
    layout: { name: "preset", fit: true, padding: 40 },
  });

  // Remember the overview positions so "Show all" can restore them.
  var orig = {};
  cy.nodes().forEach(function (n) {
    orig[n.id()] = { x: n.position("x"), y: n.position("y") };
  });

  // ---- Isolate helpers ------------------------------------------------------
  function hideAll() {
    cy.elements().style("display", "none");
  }
  function restorePositions() {
    cy.nodes().forEach(function (n) {
      var p = orig[n.id()];
      if (p) n.position(p);
    });
  }
  function column(nodes, x, cy0) {
    var n = nodes.length;
    nodes.forEach(function (node, i) {
      node.position({ x: x, y: cy0 + (i - (n - 1) / 2) * 52 });
    });
  }

  function selectOp(id) {
    var op = cy.getElementById("op_" + id);
    if (op.empty()) return;
    var edges = op.connectedEdges();
    var targets = edges.targets();
    var tbls = targets.filter("[kind='table']");
    var trgs = targets.filter("[kind='trigger']");
    var visible = op.union(edges).union(targets).union(op.ancestors());

    hideAll();
    visible.style("display", "element");
    var ox = op.position("x"),
      oy = op.position("y");
    column(tbls, ox + 330, oy);
    column(trgs, ox + 660, oy);
    cy.fit(visible, 60);
    renderOpDetail(opById[id]);
    markNav("op_" + id);
  }

  function selectTable(name) {
    var t = cy.getElementById("tbl_" + name);
    if (t.empty()) return;
    var edges = t.connectedEdges("[kind='write']");
    var srcs = edges.sources();
    var visible = t.union(edges).union(srcs); // bare ops (no compounds) for clarity

    hideAll();
    visible.style("display", "element");
    var tx = t.position("x"),
      tyy = t.position("y");
    column(srcs, tx - 360, tyy);
    cy.fit(visible, 60);
    renderTableDetail(
      name,
      srcs.map(function (o) {
        return o.id().replace(/^op_/, "");
      }),
    );
    markNav(null);
  }

  function showAll() {
    cy.elements().style("display", "element");
    restorePositions();
    cy.fit(40);
    detailEl.innerHTML = PLACEHOLDER;
    markNav(null);
  }

  cy.on("tap", "node[kind='op']", function (e) {
    selectOp(e.target.id().replace(/^op_/, ""));
  });
  cy.on("tap", "node[kind='table']", function (e) {
    selectTable(e.target.id().replace(/^tbl_/, ""));
  });

  // ---- Sidebar navigator ----------------------------------------------------
  var navButtons = {};
  function markNav(activeId) {
    Object.keys(navButtons).forEach(function (k) {
      navButtons[k].classList.toggle("active", k === activeId);
      navButtons[k].setAttribute("aria-pressed", k === activeId ? "true" : "false");
    });
  }
  SURF_ORDER.forEach(function (surface) {
    var surfOps = ops.filter(function (o) {
      return o.surface === surface;
    });
    if (!surfOps.length) return;
    var role = document.createElement("div");
    role.className = "nav-role";
    role.innerHTML =
      '<div class="nav-role-head"><span class="dot" style="background:' +
      SURF_COLOR[surface] +
      '"></span>' +
      esc(F.surfaces[surface]) +
      "</div>";
    Object.keys(F.modules).forEach(function (mkey) {
      var group = surfOps.filter(function (o) {
        return o.module === mkey;
      });
      if (!group.length) return;
      var mh = document.createElement("div");
      mh.className = "nav-mod";
      mh.textContent = F.modules[mkey];
      role.appendChild(mh);
      group.forEach(function (o) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "nav-op" + (o.status === "planned" ? " planned" : "");
        b.style.borderLeftColor = SURF_COLOR[surface];
        b.setAttribute("aria-pressed", "false");
        b.innerHTML =
          esc(o.label) +
          (o.status === "planned" ? ' <span class="badge planned">planned</span>' : "");
        b.addEventListener("click", function () {
          selectOp(o.id);
        });
        role.appendChild(b);
        navButtons["op_" + o.id] = b;
      });
    });
    navEl.appendChild(role);
  });

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
    if (!o) return;
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
        ? writers.length + " process(es) write this table"
        : "no writers (read-only here)") +
      "</div>";
    if (writers.length) {
      html += "<h3>Written by</h3>";
      writers.forEach(function (id) {
        var o = opById[id];
        if (!o) return;
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
    Array.prototype.forEach.call(detailEl.querySelectorAll(".rel-op"), function (b) {
      b.addEventListener("click", function () {
        selectOp(b.getAttribute("data-op"));
      });
    });
  }

  // ---- Controls -------------------------------------------------------------
  function zoomBy(f) {
    cy.zoom({
      level: cy.zoom() * f,
      renderedPosition: { x: cyEl.clientWidth / 2, y: cyEl.clientHeight / 2 },
    });
  }
  document.getElementById("zoomIn").onclick = function () {
    zoomBy(1.2);
  };
  document.getElementById("zoomOut").onclick = function () {
    zoomBy(1 / 1.2);
  };
  document.getElementById("fit").onclick = function () {
    cy.fit(40);
  };
  document.getElementById("showAll").onclick = showAll;

  // Sidebar search filters the process list.
  var searchEl = document.getElementById("search");
  if (searchEl)
    searchEl.addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      ops.forEach(function (o) {
        var b = navButtons["op_" + o.id];
        if (!b) return;
        var hay = (o.label + " " + (o.rpc || "") + " " + (o.writes || []).join(" ")).toLowerCase();
        b.style.display = !q || hay.indexOf(q) >= 0 ? "" : "none";
      });
    });

  // ---- Deep-link from the ER viewer: ?table=<name> --------------------------
  var deepTable = new URLSearchParams(window.location.search).get("table");
  if (deepTable && !cy.getElementById("tbl_" + deepTable).empty()) {
    selectTable(deepTable);
  }
})();
