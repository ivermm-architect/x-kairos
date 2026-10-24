// Main wiring: Cytoscape owns the phase blocks + edges + layout; a synced HTML
// overlay owns the table cards. Table nodes exist in the graph (so edges attach
// and blocks size) but are invisible on canvas — the cards are drawn on top.
(function () {
  "use strict";
  var ERV = window.ERV;

  var schema = window.__SCHEMA__;
  var meta = document.getElementById("meta");
  var legend = document.getElementById("legend");
  var cyEl = document.getElementById("cy");
  var overlay = document.getElementById("overlay");
  var detailEl = document.getElementById("detail");
  var mainEl = document.getElementById("main");
  var emptyEl = document.getElementById("empty");

  if (!schema || !Array.isArray(schema.tables) || schema.tables.length === 0) {
    mainEl.style.display = "none";
    emptyEl.style.display = "flex";
    if (schema && schema.generated_at)
      meta.textContent = "generated " + schema.generated_at + " · empty";
    return;
  }

  var C = ERV.palette;
  var relations = schema.relations || [];
  var byName = {};
  schema.tables.forEach(function (t) {
    byName[t.name] = t;
  });

  meta.textContent =
    "generated " +
    (schema.generated_at || "?") +
    " · " +
    schema.tables.length +
    " tables · " +
    relations.length +
    " relations";

  // Legend: only phases actually present on screen. Each item doubles as a
  // phase toggle (wired after the graph exists — see phase filter below).
  var present = {};
  schema.tables.forEach(function (t) {
    present[ERV.phaseKey(t.name)] = true;
  });
  var legendItems = [];
  Object.keys(present).forEach(function (k) {
    var p = k === "_" ? ERV.UNASSIGNED : ERV.PHASES[k];
    if (!p) return;
    var el = document.createElement("span");
    el.className = "item";
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-pressed", "true");
    el.title = "Toggle phase";
    el.innerHTML =
      '<span class="dot" style="background:' +
      p.color +
      '"></span><strong style="color:' +
      p.color +
      '">' +
      p.milestone +
      "</strong> · " +
      p.label;
    legend.appendChild(el);
    legendItems.push({ k: k, el: el });
  });

  // ---- Build cards (HTML), measure them, then build the graph ---------------
  var layout = ERV.computeLayout(schema);
  var cards = ERV.createCards(overlay, schema); // { els, sizes }

  var elements = [];
  layout.parentNodes.forEach(function (pn) {
    elements.push(pn);
  });
  schema.tables.forEach(function (t) {
    var s = cards.sizes[t.name];
    elements.push({
      data: {
        id: t.name,
        w: s.w,
        h: s.h,
        color: ERV.phaseOf(t.name).color,
        parent: layout.parentOf[t.name],
      },
      position: layout.positions[t.name],
    });
  });
  relations.forEach(function (r, i) {
    elements.push({
      data: {
        id: "e" + i,
        source: r.source_table,
        target: r.target_table,
        label: r.source_column + " → " + r.target_column,
      },
    });
  });

  var cy = cytoscape({
    container: cyEl,
    elements: elements,
    wheelSensitivity: 0.2,
    style: [
      {
        selector: ":parent",
        style: {
          shape: "round-rectangle",
          "background-color": "data(color)",
          "background-opacity": 0.05,
          "border-width": 2,
          "border-color": "data(color)",
          "border-opacity": 0.45,
          label: "data(label)",
          color: "data(color)",
          "text-valign": "top",
          "text-halign": "center",
          "text-margin-y": -8,
          "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
          "font-size": 22,
          "font-weight": 700,
          padding: "30px",
        },
      },
      {
        // Table nodes: invisible on canvas (cards are drawn over them) but keep
        // their geometry so edges attach to the card bounds.
        selector: "node:childless",
        style: {
          width: "data(w)",
          height: "data(h)",
          "background-opacity": 0,
          "border-width": 0,
          label: "",
          events: "no",
        },
      },
      {
        selector: "edge",
        style: {
          width: 1.5,
          "line-color": C.edge,
          "target-arrow-color": C.edge,
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          label: "data(label)",
          "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
          "font-size": 9,
          color: C.text,
          "text-background-color": C.panel,
          "text-background-opacity": 0.9,
          "text-background-shape": "round-rectangle",
          "text-background-padding": 3,
          "source-label": "N",
          "target-label": "1",
          "source-text-offset": 18,
          "target-text-offset": 22,
          "source-text-margin-y": -6,
          "target-text-margin-y": -6,
          "font-weight": 700,
        },
      },
      { selector: "edge.faded", style: { opacity: 0.1 } },
      {
        selector: "edge.highlight",
        style: {
          "line-color": C.accent,
          "target-arrow-color": C.accent,
          width: 2.5,
          color: C.accent,
          "z-index": 10,
        },
      },
    ],
    layout: { name: "preset", fit: true, padding: 50 },
  });

  // ---- Sync HTML cards to node positions ------------------------------------
  function sync() {
    var z = cy.zoom();
    for (var i = 0; i < schema.tables.length; i++) {
      var name = schema.tables[i].name;
      var n = cy.getElementById(name);
      var el = cards.els[name];
      if (!n || !el) continue;
      var pos = n.renderedPosition();
      el.style.left = pos.x + "px";
      el.style.top = pos.y + "px";
      el.style.transform = "translate(-50%, -50%) scale(" + z + ")";
    }
  }
  cy.on("render", sync);
  sync();
  window.addEventListener("resize", function () {
    cy.resize();
    sync();
  });

  // ---- Manual layout persistence (localStorage) -----------------------------
  // Keyed to the schema signature so a regenerated/changed schema never loads a
  // stale layout. Only childless (table) node positions are stored; phase blocks
  // are compounds whose geometry derives from their children.
  var LS_KEY = "erv:layout:" + (schema.generated_at || "?") + ":" + schema.tables.length;
  function saveLayout() {
    var out = {};
    schema.tables.forEach(function (t) {
      var n = cy.getElementById(t.name);
      if (!n.empty()) {
        var p = n.position();
        out[t.name] = { x: p.x, y: p.y };
      }
    });
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(out));
    } catch (e) {
      /* storage disabled / quota — non-fatal */
    }
  }
  function loadLayout() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function applyLayout(saved) {
    if (!saved) return false;
    var applied = 0;
    schema.tables.forEach(function (t) {
      var p = saved[t.name];
      var n = cy.getElementById(t.name);
      if (p && !n.empty()) {
        n.position({ x: p.x, y: p.y });
        applied++;
      }
    });
    return applied > 0;
  }
  if (applyLayout(loadLayout())) {
    cy.fit(50);
    sync();
  }

  // ---- Focus / highlight ----------------------------------------------------
  function forEachCard(fn) {
    Object.keys(cards.els).forEach(function (name) {
      fn(cards.els[name], name);
    });
  }
  function clearFocus() {
    forEachCard(function (el) {
      el.classList.remove("faded", "highlight");
    });
    cy.edges().removeClass("faded highlight");
    detailEl.innerHTML = ERV.placeholder;
  }
  function focus(nodeIds, hoodEdges) {
    forEachCard(function (el) {
      el.classList.add("faded");
      el.classList.remove("highlight");
    });
    nodeIds.forEach(function (id) {
      var el = cards.els[id];
      if (el) (el.classList.remove("faded"), el.classList.add("highlight"));
    });
    cy.edges().addClass("faded").removeClass("highlight");
    hoodEdges.removeClass("faded").addClass("highlight");
  }

  function focusTable(name) {
    var n = cy.getElementById(name);
    if (n.empty()) return;
    var nb = n.closedNeighborhood();
    focus(nb.nodes(":childless").map(idOf), nb.edges());
    ERV.renderDetail(detailEl, byName, relations, name);
  }
  function focusBlock(parent) {
    var kids = parent.children();
    var hood = kids;
    kids.forEach(function (k) {
      hood = hood.union(k.closedNeighborhood());
    });
    focus(hood.nodes(":childless").map(idOf), hood.edges());
    ERV.renderBlockDetail(detailEl, parent.data("label"), kids.map(idOf));
  }
  function idOf(ele) {
    return ele.id();
  }

  // Card pointer → drag the table, or (if it barely moved) treat as a click and
  // focus it. Dragging a card moves its invisible Cytoscape node; the existing
  // render→sync loop keeps the card and its edges glued to the new position.
  // Screen deltas are divided by zoom to convert to model coordinates.
  var DRAG_THRESHOLD = 4; // px before a press counts as a drag, not a click
  forEachCard(function (el, name) {
    var node = null,
      startX = 0,
      startY = 0,
      lastX = 0,
      lastY = 0,
      moved = false;
    el.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0) return;
      node = cy.getElementById(name);
      if (node.empty()) {
        node = null;
        return;
      }
      startX = lastX = ev.clientX;
      startY = lastY = ev.clientY;
      moved = false;
      try {
        el.setPointerCapture(ev.pointerId);
      } catch (e) {
        /* capture unsupported — drag still works via document */
      }
      ev.preventDefault();
    });
    el.addEventListener("pointermove", function (ev) {
      if (!node) return;
      if (!moved) {
        if (
          Math.abs(ev.clientX - startX) < DRAG_THRESHOLD &&
          Math.abs(ev.clientY - startY) < DRAG_THRESHOLD
        )
          return;
        moved = true;
        el.classList.add("dragging");
      }
      var z = cy.zoom();
      var p = node.position();
      node.position({ x: p.x + (ev.clientX - lastX) / z, y: p.y + (ev.clientY - lastY) / z });
      lastX = ev.clientX;
      lastY = ev.clientY;
      sync();
    });
    function end(ev) {
      if (!node) return;
      el.classList.remove("dragging");
      try {
        el.releasePointerCapture(ev.pointerId);
      } catch (e) {
        /* ignore */
      }
      if (!moved) focusTable(name);
      node = null;
    }
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  });
  // Block click (canvas parent) → focus the whole phase. Dragging a block is
  // handled natively by Cytoscape (children move with it); sync follows.
  cy.on("tap", "node", function (evt) {
    if (evt.target.data("isPhase")) focusBlock(evt.target);
  });
  // Empty canvas → reset.
  cy.on("tap", function (evt) {
    if (evt.target === cy) clearFocus();
  });

  // ---- Controls -------------------------------------------------------------
  function zoomBy(factor) {
    cy.zoom({
      level: cy.zoom() * factor,
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
  document.getElementById("relayout").onclick = function () {
    cy.layout({ name: "preset", positions: layout.positions, fit: true, padding: 50 }).run();
  };

  function flash(btn, txt) {
    var old = btn.textContent;
    btn.textContent = txt;
    setTimeout(function () {
      btn.textContent = old;
    }, 900);
  }
  document.getElementById("save").onclick = function () {
    saveLayout();
    flash(this, "Saved");
  };
  document.getElementById("clearSaved").onclick = function () {
    try {
      localStorage.removeItem(LS_KEY);
    } catch (e) {
      /* ignore */
    }
    cy.layout({ name: "preset", positions: layout.positions, fit: true, padding: 50 }).run();
    flash(this, "Cleared");
  };

  // ---- Search: highlight tables/columns matching the query -----------------
  function runSearch(q) {
    q = (q || "").trim().toLowerCase();
    if (!q) {
      clearFocus();
      return;
    }
    var hits = [];
    schema.tables.forEach(function (t) {
      var hit =
        t.name.toLowerCase().indexOf(q) >= 0 ||
        t.columns.some(function (c) {
          return c.name.toLowerCase().indexOf(q) >= 0;
        });
      if (hit) hits.push(t.name);
    });
    forEachCard(function (el) {
      el.classList.add("faded");
      el.classList.remove("highlight");
    });
    cy.edges().addClass("faded").removeClass("highlight");
    hits.forEach(function (name) {
      var el = cards.els[name];
      if (el) (el.classList.remove("faded"), el.classList.add("highlight"));
    });
    if (hits.length) {
      var n = cy.getElementById(hits[0]);
      if (!n.empty()) cy.center(n);
      ERV.renderDetail(detailEl, byName, relations, hits[0]);
    }
  }
  var searchEl = document.getElementById("search");
  if (searchEl)
    searchEl.addEventListener("input", function () {
      runSearch(this.value);
    });

  // ---- Phase filter: legend items toggle their phase on/off ----------------
  var hiddenPhases = {};
  function togglePhase(k, item) {
    hiddenPhases[k] = !hiddenPhases[k];
    var off = !!hiddenPhases[k];
    item.classList.toggle("off", off);
    item.setAttribute("aria-pressed", off ? "false" : "true");
    schema.tables.forEach(function (t) {
      if (ERV.phaseKey(t.name) === k) {
        var el = cards.els[t.name];
        if (el) el.style.display = off ? "none" : "";
      }
    });
    cy.getElementById("phase_" + k).style("display", off ? "none" : "element");
    sync();
  }
  legendItems.forEach(function (it) {
    it.el.addEventListener("click", function () {
      togglePhase(it.k, it.el);
    });
    it.el.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        togglePhase(it.k, it.el);
      }
    });
  });

  // Minimap — only if the navigator extension loaded (CDN guard).
  if (typeof cy.navigator === "function") {
    cy.navigator({ container: "#minimap", viewLiveFramerate: 0 });
  } else {
    document.getElementById("minimap").style.display = "none";
  }
})();
