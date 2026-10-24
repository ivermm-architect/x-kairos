// Data-flow viewer — business flows as staged pipelines.
//
// Left sidebar lists end-to-end flows (Ventas, Pedido web, Caja, Inventario).
// The canvas shows them like a process diagram: stage headers across the top and
// the steps chained left→right. The overview stacks every flow as a compact row;
// picking one expands it, adding under each step the tables it writes (the data
// each process moves). Click a step for its full characteristics (RPC, guard,
// writes, triggers, downstream).
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

  var flows = (F && F.flows) || [];
  if (!F || !Array.isArray(F.operations) || !flows.length) {
    document.getElementById("main").style.display = "none";
    document.getElementById("empty").style.display = "flex";
    return;
  }

  // ---- Palette / tokens -----------------------------------------------------
  var C = {
    panel: "#161b22",
    bg: "#0d1117",
    border: "#30363d",
    text: "#e6edf3",
    muted: "#8b949e",
    accent: "#58a6ff",
    stage: "#39c5cf",
    table: "#79c0ff",
  };
  var SURF_COLOR = { pos: "#7ee787", admin: "#d2a8ff", storefront: "#ffa657" };
  var PLACEHOLDER = detailEl.innerHTML;

  var opById = {};
  F.operations.forEach(function (o) {
    opById[o.id] = o;
  });

  metaEl.textContent =
    "generated " + (F.generated_at || "?") + " · " + flows.length + " business flows";

  function width(label, per, min) {
    return Math.max(min || 96, String(label).length * (per || 7.2) + 24);
  }
  function truncWrites(arr) {
    if (!arr || !arr.length) return "";
    if (arr.length <= 3) return arr.join(", ");
    return arr.slice(0, 3).join(", ") + " +" + (arr.length - 3);
  }

  // ---- Layout constants -----------------------------------------------------
  var COL_W = 360; // stage column width (wide enough to keep columns apart)
  var STAGE_Y = 0; // stage header row
  var OP_Y0 = 110; // first op under its stage header
  var OP_STEP = 200; // vertical gap between stacked (alternative) ops
  var CAP_DY = 46; // Spanish action caption under its op
  var SUB_DY = 104; // writes sub-node under its op
  var BAND_H = 150; // overview: vertical space per flow row
  var LABEL_X = -240; // overview: flow label column

  // ---- Element builders -----------------------------------------------------
  function stageHeader(id, label, x, y) {
    return {
      data: { id: id, label: label, kind: "stage", w: width(label, 7.5, 110) },
      position: { x: x, y: y },
    };
  }
  function opNode(id, o, x, y) {
    var lbl = o.es || o.label;
    return {
      data: {
        id: id,
        op: o.id,
        label: lbl,
        kind: "op",
        color: SURF_COLOR[o.surface] || C.accent,
        planned: o.status === "planned" ? 1 : 0,
        w: width(lbl, 7.2, 150),
      },
      position: { x: x, y: y },
    };
  }
  function capNode(id, text, x, y) {
    return {
      data: { id: id, label: text, kind: "cap" },
      position: { x: x, y: y },
    };
  }
  function subNode(id, writes, x, y) {
    var txt = "escribe: " + (truncWrites(writes) || "sin escritura de tablas");
    return {
      data: { id: id, label: txt, kind: "sub" },
      position: { x: x, y: y },
    };
  }
  function edge(id, s, t, kind) {
    return { data: { id: id, source: s, target: t, kind: kind } };
  }

  // Expanded single-flow pipeline: stage headers + ops + writes sub-nodes.
  function buildFlow(flow) {
    var els = [];
    flow.stages.forEach(function (st, si) {
      var x = si * COL_W;
      els.push(stageHeader("st_" + flow.id + "_" + si, st.label, x, STAGE_Y));
      st.ops.forEach(function (opId, oi) {
        var o = opById[opId];
        if (!o) return;
        var y = OP_Y0 + oi * OP_STEP;
        var nid = "op_" + flow.id + "_" + opId;
        els.push(opNode(nid, o, x, y));
        if (o.does) els.push(capNode("cap_" + flow.id + "_" + opId, o.does, x, y + CAP_DY));
        var sid = "sub_" + flow.id + "_" + opId;
        els.push(subNode(sid, o.writes, x, y + SUB_DY));
        els.push(edge("d_" + nid, nid, sid, "data"));
      });
    });
    // Backbone: stage→stage through each stage's primary (first) op.
    for (var i = 0; i < flow.stages.length - 1; i++) {
      var a = flow.stages[i].ops[0],
        b = flow.stages[i + 1].ops[0];
      if (a && b && opById[a] && opById[b]) {
        els.push(
          edge(
            "f_" + flow.id + "_" + i,
            "op_" + flow.id + "_" + a,
            "op_" + flow.id + "_" + b,
            "flow",
          ),
        );
      }
    }
    return els;
  }

  // Overview: every flow as a compact horizontal band (label + stage ops).
  function buildOverview() {
    var els = [];
    flows.forEach(function (flow, fi) {
      var yc = fi * BAND_H + 40;
      els.push({
        data: { id: "fl_" + flow.id, flow: flow.id, label: flow.label, kind: "flowlabel" },
        position: { x: LABEL_X, y: yc },
      });
      flow.stages.forEach(function (st, si) {
        var x = si * COL_W;
        var primary = st.ops[0];
        var o = primary && opById[primary];
        if (!o) return;
        var nid = "op_" + flow.id + "_" + primary;
        els.push(opNode(nid, o, x, yc));
      });
      for (var i = 0; i < flow.stages.length - 1; i++) {
        var a = flow.stages[i].ops[0],
          b = flow.stages[i + 1].ops[0];
        if (a && b && opById[a] && opById[b]) {
          els.push(
            edge(
              "f_" + flow.id + "_" + i,
              "op_" + flow.id + "_" + a,
              "op_" + flow.id + "_" + b,
              "flow",
            ),
          );
        }
      }
    });
    return els;
  }

  // ---- Cytoscape ------------------------------------------------------------
  var cy = cytoscape({
    container: cyEl,
    elements: [],
    wheelSensitivity: 0.2,
    style: [
      {
        selector: "node[kind='stage']",
        style: {
          shape: "round-rectangle",
          width: "data(w)",
          height: 30,
          "background-color": C.stage,
          "background-opacity": 0.14,
          "border-width": 1,
          "border-color": C.stage,
          label: "data(label)",
          color: C.stage,
          "text-valign": "center",
          "text-halign": "center",
          "font-size": 12,
          "font-weight": 700,
          "text-transform": "uppercase",
        },
      },
      {
        selector: "node[kind='flowlabel']",
        style: {
          shape: "round-rectangle",
          width: 150,
          height: 34,
          "background-color": C.panel,
          "border-width": 1,
          "border-color": C.border,
          label: "data(label)",
          color: C.text,
          "text-valign": "center",
          "text-halign": "center",
          "font-size": 13,
          "font-weight": 700,
        },
      },
      {
        selector: "node[kind='op']",
        style: {
          shape: "round-rectangle",
          width: "data(w)",
          height: 36,
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
        style: { "border-style": "dashed", opacity: 0.75 },
      },
      {
        selector: "node[kind='cap']",
        style: {
          shape: "rectangle",
          width: 260,
          height: "label",
          padding: "2px",
          "background-opacity": 0,
          "border-width": 0,
          label: "data(label)",
          color: C.muted,
          "text-wrap": "wrap",
          "text-max-width": 256,
          "font-size": 10,
          "line-height": 1.3,
          "text-valign": "center",
          "text-halign": "center",
          events: "no",
        },
      },
      {
        selector: "node[kind='sub']",
        style: {
          shape: "round-rectangle",
          width: 260,
          height: "label",
          padding: "7px",
          "background-color": "#0f2230",
          "border-width": 1,
          "border-color": C.table,
          "border-opacity": 0.6,
          label: "data(label)",
          color: C.table,
          "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
          "font-size": 10,
          "line-height": 1.4,
          "text-wrap": "wrap",
          "text-max-width": 244,
          "text-valign": "center",
          "text-halign": "center",
        },
      },
      {
        selector: "edge[kind='flow']",
        style: {
          width: 2.2,
          "line-color": C.accent,
          "target-arrow-color": C.accent,
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "arrow-scale": 1,
        },
      },
      {
        selector: "edge[kind='data']",
        style: {
          width: 1,
          "line-color": C.table,
          "line-opacity": 0.5,
          "line-style": "dashed",
          "curve-style": "straight",
          "target-arrow-shape": "none",
        },
      },
      { selector: ".dim", style: { opacity: 0.18 } },
    ],
    layout: { name: "preset" },
  });

  // ---- Views ----------------------------------------------------------------
  function showOverview() {
    cy.elements().remove();
    cy.add(buildOverview());
    cy.fit(50);
    detailEl.innerHTML = PLACEHOLDER;
    markNav(null);
  }
  function selectFlow(flow) {
    cy.elements().remove();
    cy.add(buildFlow(flow));
    cy.fit(50);
    renderFlowDetail(flow);
    markNav(flow.id);
  }
  function selectOp(opId) {
    renderOpDetail(opById[opId]);
    var sel = cy.nodes("[op = '" + opId + "']");
    if (sel.nonempty()) {
      cy.elements().addClass("dim");
      sel.removeClass("dim");
      sel.connectedEdges().removeClass("dim");
    }
  }

  cy.on("tap", "node[kind='op']", function (e) {
    selectOp(e.target.data("op"));
  });
  cy.on("tap", "node[kind='flowlabel']", function (e) {
    var f = byId(e.target.data("flow"));
    if (f) selectFlow(f);
  });
  cy.on("tap", function (e) {
    if (e.target === cy) cy.elements().removeClass("dim");
  });

  function byId(id) {
    for (var i = 0; i < flows.length; i++) if (flows[i].id === id) return flows[i];
    return null;
  }

  // ---- Sidebar navigator ----------------------------------------------------
  var navButtons = {};
  function markNav(activeId) {
    Object.keys(navButtons).forEach(function (k) {
      navButtons[k].classList.toggle("active", k === activeId);
      navButtons[k].setAttribute("aria-pressed", k === activeId ? "true" : "false");
    });
  }
  flows.forEach(function (flow) {
    var wrap = document.createElement("div");
    wrap.className = "nav-flow";
    var planned = flow.stages.every(function (st) {
      return st.ops.every(function (id) {
        return opById[id] && opById[id].status === "planned";
      });
    });
    var head = document.createElement("button");
    head.type = "button";
    head.className = "nav-flow-head" + (planned ? " planned" : "");
    head.setAttribute("aria-pressed", "false");
    head.innerHTML =
      esc(flow.label) + (planned ? ' <span class="badge planned">planned</span>' : "");
    head.addEventListener("click", function () {
      selectFlow(flow);
    });
    wrap.appendChild(head);
    navButtons[flow.id] = head;

    flow.stages.forEach(function (st) {
      st.ops.forEach(function (opId) {
        var o = opById[opId];
        if (!o) return;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "nav-op" + (o.status === "planned" ? " planned" : "");
        b.style.borderLeftColor = SURF_COLOR[o.surface] || C.border;
        b.innerHTML = '<span class="nav-stage">' + esc(st.label) + "</span>" + esc(o.es || o.label);
        b.addEventListener("click", function () {
          selectFlow(flow);
          selectOp(opId);
        });
        wrap.appendChild(b);
        navButtons["op_" + flow.id + "_" + opId] = b;
      });
    });
    navEl.appendChild(wrap);
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
  function renderFlowDetail(flow) {
    var html = "<h2>" + esc(flow.label) + "</h2>";
    html += "<p class='desc'>" + esc(flow.desc || "") + "</p>";
    if (flow.note)
      html += "<div class='kv'><span>Nota</span><span>" + esc(flow.note) + "</span></div>";
    html += "<h3>Etapas</h3>";
    flow.stages.forEach(function (st) {
      html += "<div class='stage-row'><b>" + esc(st.label) + "</b>";
      st.ops.forEach(function (opId) {
        var o = opById[opId];
        if (!o) return;
        html +=
          "<button type='button' class='rel-op' data-op='" +
          esc(opId) +
          "'>" +
          esc(o.es || o.label) +
          "<span class='op-rpc'>" +
          esc(o.rpc || "direct DML") +
          "</span></button>";
      });
      html += "</div>";
    });
    detailEl.innerHTML = html;
    wireRelOps();
  }
  function renderOpDetail(o) {
    if (!o) return;
    var html = "<h2>" + esc(o.es || o.label) + "</h2>";
    html +=
      "<div class='sub'>" +
      esc(F.modules[o.module] || o.module) +
      " · " +
      esc(F.surfaces[o.surface] || o.surface) +
      (o.status === "planned" ? " · <span class='badge planned'>planned</span>" : "") +
      "</div>";
    if (o.does) html += "<p class='desc'>" + esc(o.does) + "</p>";
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
  function wireRelOps() {
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
    cy.fit(50);
  };
  document.getElementById("showAll").onclick = showOverview;

  // Sidebar search filters the step buttons by label / rpc / table.
  var searchEl = document.getElementById("search");
  if (searchEl)
    searchEl.addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      flows.forEach(function (flow) {
        flow.stages.forEach(function (st) {
          st.ops.forEach(function (opId) {
            var b = navButtons["op_" + flow.id + "_" + opId];
            var o = opById[opId];
            if (!b || !o) return;
            var hay = (
              o.label +
              " " +
              (o.rpc || "") +
              " " +
              (o.writes || []).join(" ")
            ).toLowerCase();
            b.style.display = !q || hay.indexOf(q) >= 0 ? "" : "none";
          });
        });
      });
    });

  // ---- Initial view + deep-link (?flow= / ?table=) --------------------------
  var params = new URLSearchParams(window.location.search);
  var deepFlow = params.get("flow");
  var deepTable = params.get("table");
  if (deepFlow && byId(deepFlow)) {
    selectFlow(byId(deepFlow));
  } else if (deepTable) {
    // Land on the first flow whose any op writes the table, highlight that step.
    var hit = null,
      hitOp = null;
    flows.forEach(function (flow) {
      flow.stages.forEach(function (st) {
        st.ops.forEach(function (opId) {
          var o = opById[opId];
          if (!hit && o && (o.writes || []).indexOf(deepTable) >= 0) {
            hit = flow;
            hitOp = opId;
          }
        });
      });
    });
    if (hit) {
      selectFlow(hit);
      selectOp(hitOp);
    } else {
      showOverview();
    }
  } else {
    showOverview();
  }
})();
