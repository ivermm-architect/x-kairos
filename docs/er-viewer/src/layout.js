// Deterministic block layout. cose is force-directed and seeded at random, so
// the map was tangled and different on every load. Instead each phase becomes a
// labelled compound block and its tables sit on a fixed grid, so the diagram is
// stable and reads by milestone. Cytoscape just honours these preset positions.
(function () {
  "use strict";
  var ERV = (window.ERV = window.ERV || {});

  var COLS_IN_BLOCK = 2; // tables per row inside a block
  var CELL_W = 340,
    CELL_H = 360; // grid spacing (generous; cards are measured, not guessed)
  var BLOCK_GAP_X = 160,
    BLOCK_GAP_Y = 200,
    BLOCKS_PER_ROW = 3;

  // Returns { order, grouped, positions, parentOf, parentNodes }.
  ERV.computeLayout = function (schema) {
    var grouped = {};
    schema.tables.forEach(function (t) {
      var k = ERV.phaseKey(t.name);
      (grouped[k] = grouped[k] || []).push(t.name);
    });
    Object.keys(grouped).forEach(function (k) {
      grouped[k].sort();
    });

    // Draw phases in milestone order; unassigned last.
    var order = Object.keys(ERV.PHASES)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      })
      .filter(function (k) {
        return grouped[k];
      });
    if (grouped["_"]) order.push("_");

    var positions = {};
    var parentOf = {};
    var parentNodes = [];
    var cursorX = 0,
      cursorY = 0,
      rowMaxH = 0,
      inRow = 0;

    order.forEach(function (k) {
      var tables = grouped[k];
      var cols = Math.min(COLS_IN_BLOCK, tables.length);
      var rows = Math.ceil(tables.length / cols);
      var pid = "phase_" + k;
      var p = k === "_" ? ERV.UNASSIGNED : ERV.PHASES[k];
      parentNodes.push({
        data: { id: pid, label: p.milestone + " · " + p.label, color: p.color, isPhase: 1 },
      });
      tables.forEach(function (name, i) {
        positions[name] = {
          x: cursorX + (i % cols) * CELL_W,
          y: cursorY + Math.floor(i / cols) * CELL_H,
        };
        parentOf[name] = pid;
      });
      rowMaxH = Math.max(rowMaxH, rows * CELL_H);
      cursorX += cols * CELL_W + BLOCK_GAP_X;
      if (++inRow >= BLOCKS_PER_ROW) {
        inRow = 0;
        cursorX = 0;
        cursorY += rowMaxH + BLOCK_GAP_Y;
        rowMaxH = 0;
      }
    });

    return {
      order: order,
      grouped: grouped,
      positions: positions,
      parentOf: parentOf,
      parentNodes: parentNodes,
    };
  };
})();
