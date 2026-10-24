// Data-flow viewer — a connected graph (Cytoscape) grouped as
//   User (surface)  ▸  Module  ▸  Process (operation)
// with arrows flowing right from each process to the tables it writes and the
// triggers it fires. Reuses the ER viewer's engine; nodes are native (short
// single-line labels) and draggable, compounds auto-fit their children.
//
// Click a process  → trace its flow (highlight its edges + targets, fade rest).
// Click a table    → highlight the processes that write it (cross-link).
// Click empty space → reset. ?table=<name> deep-links from the ER viewer.
(function () {
  "use strict";

  var F = window.__FLOWS__;
  var cyEl = document.getElementById("cy");
  var detailEl = document.getElementById("detail");
  var metaEl = document.getElementById("meta");
  var legendEl = document.getElementById("legend");

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
    bg: "#0d1117",
    panel: "#161b22",
    border: "#30363d",
    text: "#e6edf3",
    muted: "#8b949e",
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

  // ---- Legend (surfaces) ----------------------------------------------------
  SURF_ORDER.forEach(function (s) {
    if (!F.surfaces[s]) return;
    var el = document.createElement("span");
    el.className = "item";
    el.innerHTML =
      '<span class="dot" style="background:' +
      SURF_COLOR[s] +
      '"></span><strong style="color:' +
      SURF_COLOR[s] +
      '">' +
      esc(F.surfaces[s]) +
      "</strong>";
    legendEl.appendChild(el);
  });

  // ---- Helpers --------------------------------------------------------------
  function width(label) {
    return Math.max(96, label.length * 7.3 + 26);
  }
  function slug(s) {
    return s.replace(/[^a-zA-Z0-9]+/g, "_");
  }

  // ---- Build elements -------------------------------------------------------
  var elements = [];
  var tableSeen = {};
  var trigSeen = {};

  // Column X per lane; preset positions only for leaves (compounds auto-fit).
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

  // Tables + triggers as leaf nodes on the right, plus the flow edges.
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
          "text-valign": "center",
          "text-halign": "center",
          "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
          "font-size": 11,
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
          width: 1.5,
          "line-color": C.border,
          "target-arrow-color": C.border,
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "arrow-scale": 0.9,
        },
      },
      {
        selector: "edge[kind='fire']",
        style: {
          width: 1.2,
          "line-color": C.trigger,
          "line-style": "dashed",
          "line-opacity": 0.5,
          "target-arrow-color": C.trigger,
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "arrow-scale": 0.8,
        },
      },
      { selector: ".faded", style: { opacity: 0.08 } },
      {
        selector: "node.hl",
        style: { "border-color": C.accent, "border-width": 3, "z-index": 10 },
      },
      {
        selector: "edge.hl",
        style: {
          "line-color": C.accent,
          "target-arrow-color": C.accent,
          "line-opacity": 1,
          width: 2.5,
          "z-index": 10,
        },
      },
    ],
    layout: { name: "preset", fit: true, padding: 40 },
  });

  // ---- Focus / highlight ----------------------------------------------------
  function clearFocus() {
    cy.elements().removeClass("faded hl");
    detailEl.innerHTML = PLACEHOLDER;
  }
  function focusEles(coll) {
    cy.elements().addClass("faded");
    coll.removeClass("faded").addClass("hl");
  }

  function focusOp(id) {
    var n = cy.getElementById("op_" + id);
    if (n.empty()) return;
    var edges = n.connectedEdges();
    var hood = n.union(edges).union(edges.connectedNodes());
    focusEles(hood.union(n.ancestors()));
    renderOpDetail(opById[id]);
  }
  function focusTable(name) {
    var n = cy.getElementById("tbl_" + name);
    if (n.empty()) return;
    var edges = n.connectedEdges();
    var srcOps = edges.sources();
    var hood = n.union(edges).union(srcOps);
    focusEles(hood.union(srcOps.ancestors()));
    renderTableDetail(
      name,
      srcOps.map(function (o) {
        return o.id().replace(/^op_/, "");
      }),
    );
  }

  cy.on("tap", "node[kind='op']", function (e) {
    focusOp(e.target.id().replace(/^op_/, ""));
  });
  cy.on("tap", "node[kind='table']", function (e) {
    focusTable(e.target.id().replace(/^tbl_/, ""));
  });
  cy.on("tap", function (e) {
    if (e.target === cy) clearFocus();
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
        focusOp(b.getAttribute("data-op"));
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

  var searchEl = document.getElementById("search");
  if (searchEl)
    searchEl.addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      if (!q) {
        clearFocus();
        return;
      }
      var hits = cy.nodes("[kind='op'], [kind='table']").filter(function (n) {
        var o = opById[n.id().replace(/^op_/, "")];
        var hay =
          n.data("label") + " " + (o ? (o.rpc || "") + " " + (o.writes || []).join(" ") : "");
        return hay.toLowerCase().indexOf(q) >= 0;
      });
      if (hits.empty()) {
        cy.elements().addClass("faded");
        return;
      }
      var hood = hits;
      hits.forEach(function (n) {
        hood = hood.union(n.connectedEdges()).union(n.connectedEdges().connectedNodes());
      });
      focusEles(hood.union(hits.ancestors()));
    });

  // ---- Deep-link from the ER viewer: ?table=<name> --------------------------
  var deepTable = new URLSearchParams(window.location.search).get("table");
  if (deepTable && !cy.getElementById("tbl_" + deepTable).empty()) {
    focusTable(deepTable);
    cy.animate(
      { fit: { eles: cy.getElementById("tbl_" + deepTable).closedNeighborhood(), padding: 80 } },
      { duration: 250 },
    );
  }
})();
