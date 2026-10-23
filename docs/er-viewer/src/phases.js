// Phase metadata (manual; NOT part of the DB dump). Each table belongs to a
// build phase/milestone; its color drives both the canvas block and the HTML
// card. Add table names here as new phases land.
(function () {
  "use strict";
  var ERV = (window.ERV = window.ERV || {});

  ERV.PHASES = {
    0: { milestone: "M0", label: "Foundation", color: "#58a6ff" },
    1: { milestone: "M1", label: "Catalog", color: "#7ee787" },
    2: { milestone: "M2", label: "Inventory", color: "#d2a8ff" },
    3: { milestone: "M3", label: "Sales / POS", color: "#ffa657" },
    4: { milestone: "M4", label: "Cash", color: "#f2cc60" },
    5: { milestone: "M5", label: "Web public", color: "#ff7b72" },
  };

  ERV.TABLE_PHASE = {
    staff: 0,
    roles: 0,
    staff_roles: 0,
    measurement_units: 1,
    categories: 1,
    brands: 1,
    products: 1,
    product_images: 1,
    product_units: 1,
    product_price_tiers: 1,
    warehouses: 2,
    warehouse_locations: 2,
    stock_entries: 2,
    stock_entry_items: 2,
    warehouse_stock: 2,
    inventory_movements: 2,
    transfers: 2,
    transfer_items: 2,
    transfer_lots: 2,
    clients: 3,
    cash_registers: 3,
    cash_sessions: 3,
    quotations: 3,
    sales: 3,
    sale_items: 3,
    sale_payments: 3,
    credit_payments: 3,
    cash_movements: 3,
    quotation_items: 3,
    returns: 3,
    return_items: 3,
  };

  ERV.UNASSIGNED = { milestone: "—", label: "Unassigned", color: "#8b949e" };

  // Literal colors — Cytoscape draws edges/blocks on canvas and cannot read
  // CSS variables.
  ERV.palette = {
    bg: "#0d1117",
    panel: "#161b22",
    text: "#e6edf3",
    muted: "#8b949e",
    edge: "#8b949e",
    accent: "#58a6ff",
  };

  ERV.phaseKey = function (name) {
    return ERV.TABLE_PHASE.hasOwnProperty(name) ? ERV.TABLE_PHASE[name] : "_";
  };

  ERV.phaseOf = function (name) {
    return ERV.TABLE_PHASE.hasOwnProperty(name)
      ? ERV.PHASES[ERV.TABLE_PHASE[name]]
      : ERV.UNASSIGNED;
  };
})();
