// Curated data-flow dataset: how each business operation moves data through the
// app via Supabase. Hand-curated from the migrations (supabase/migrations/*.sql)
// and cross-checked against the trigger/guard definitions — NOT auto-generated.
//
// Every `live` operation maps to a real RPC in the migrations (file:line in
// `source`). Operations flagged `planned` are designed in the schema/comments
// but have no RPC yet (inventory receiving, transfers, defective/relocate are
// referenced as "written by inventory RPCs" in 0004 but those RPCs are not in
// the migrations), so they are shown as gaps rather than invented.
//
// Shape consumed by src/flow.js:
//   surfaces : { key: label }           — client lanes (who calls)
//   modules  : { key: label }           — operation groupings
//   operations[] : {
//     id, label, module, surface,
//     rpc        : "name(...)" | null,  — null => direct table DML under RLS
//     signature  : exact SQL signature,
//     security   : "SECURITY DEFINER" | "RLS only" | ...,
//     guard      : "assert_staff()" | "none (public)" | "RLS is_active_staff()",
//     writes[]   : tables mutated,
//     reads[]    : notable tables read (optional),
//     triggers[] : triggers that fire as a consequence,
//     downstream : prose description of side effects,
//     source     : "file:line",
//     status     : "live" | "planned"
//   }
window.__FLOWS__ = {
  generated_at: "2026-10-23",

  surfaces: {
    pos: "POS · staff",
    admin: "Admin · staff",
    storefront: "Storefront · public",
  },

  modules: {
    auth: "Auth / guards",
    cash: "Cash drawer",
    sales: "Sales",
    credit: "Credit",
    quotations: "Quotations",
    returns: "Returns",
    web: "Web storefront",
    inventory: "Inventory",
  },

  operations: [
    // ---- Auth / guards ------------------------------------------------------
    {
      id: "is_active_staff",
      label: "Resolve staff flag",
      module: "auth",
      surface: "pos",
      rpc: "is_active_staff()",
      signature: "public.is_active_staff() returns boolean",
      security: "SECURITY DEFINER, stable",
      guard: "— (the guard itself)",
      writes: [],
      reads: ["staff", "staff_roles"],
      triggers: [],
      downstream:
        "Backbone of RLS. Read on login by the AuthProvider to gate the UI; every table policy and every assert_staff() call funnels through it.",
      source: "0001_foundation.sql:70",
      status: "live",
    },

    // ---- Cash drawer --------------------------------------------------------
    {
      id: "open_cash_session",
      label: "Open cash session",
      module: "cash",
      surface: "pos",
      rpc: "open_cash_session(...)",
      signature:
        "public.open_cash_session(p_register_id uuid, p_opening_amount numeric) returns public.cash_sessions",
      security: "SECURITY DEFINER",
      guard: "assert_staff()",
      writes: ["cash_sessions"],
      triggers: ["audit_trigger (cash_sessions)"],
      downstream: "Opens the drawer with a counted opening float; one open session per register.",
      source: "0005_sales_cash.sql:557",
      status: "live",
    },
    {
      id: "close_cash_session",
      label: "Close cash session",
      module: "cash",
      surface: "pos",
      rpc: "close_cash_session(...)",
      signature:
        "public.close_cash_session(p_session_id uuid, p_actual_amount numeric, p_notes text default null) returns public.cash_sessions",
      security: "SECURITY DEFINER",
      guard: "assert_staff()",
      writes: ["cash_sessions"],
      triggers: ["audit_trigger (cash_sessions)"],
      downstream: "Reconciles counted vs expected (in base currency) and records the variance.",
      source: "0005_sales_cash.sql:637",
      status: "live",
    },
    {
      id: "add_cash_movement",
      label: "Add cash movement",
      module: "cash",
      surface: "pos",
      rpc: "add_cash_movement(...)",
      signature:
        "public.add_cash_movement(p_session_id uuid, p_movement_type text, p_amount numeric, p_description text default null, p_expense_category text default null, p_reference_type text default null, p_reference_id uuid default null, p_currency text default 'BOB') returns public.cash_movements",
      security: "SECURITY DEFINER",
      guard: "assert_staff()",
      writes: ["cash_movements", "cash_sessions"],
      triggers: ["trg_cashmov_set_base (cash_movements)", "audit_trigger (cash_sessions)"],
      downstream:
        "Posts income/expense/refund to the open session; trg_cashmov_set_base freezes the rate and stores amount_base.",
      source: "0007_multicurrency.sql:254",
      status: "live",
    },

    // ---- Sales --------------------------------------------------------------
    {
      id: "register_sale",
      label: "Register sale",
      module: "sales",
      surface: "pos",
      rpc: "register_sale(...)",
      signature:
        "public.register_sale(p_warehouse_id uuid, p_items jsonb, p_sale_mode text default 'direct', p_sale_type text default 'retail', p_payment_method text default 'cash', p_client_id uuid default null, p_cash_session_id uuid default null, p_discount_amount numeric default 0, p_tax_rate numeric default 0, p_amount_paid numeric default 0, p_advance_amount numeric default 0, p_credit_due_date date default null, p_shipping_date date default null, p_notes text default null, p_currency text default 'BOB') returns public.sales",
      security: "SECURITY DEFINER, search_path = public, pg_temp",
      guard: "assert_staff()",
      writes: ["sales", "sale_items", "sale_payments", "warehouse_stock", "inventory_movements"],
      triggers: ["trg_sales_set_base (sales)", "audit_trigger (sales)"],
      downstream:
        "Server prices every line. For direct/credit modes calls _emit_sale_exit: FIFO lot lock (FOR UPDATE on warehouse_stock), decrements oldest lots, stamps source_lot_id, posts kardex 'exit'. trg_sales_set_base freezes exchange_rate + *_base. Fixes oversell (D-sales).",
      source: "0007_multicurrency.sql:317",
      status: "live",
    },
    {
      id: "deliver_order",
      label: "Deliver order (deferred)",
      module: "sales",
      surface: "pos",
      rpc: "deliver_order(p_sale_id uuid)",
      signature: "public.deliver_order(p_sale_id uuid) returns public.sales",
      security: "SECURITY DEFINER",
      guard: "assert_staff()",
      writes: ["sales", "warehouse_stock", "inventory_movements"],
      triggers: ["trg_sales_set_base (sales)", "audit_trigger (sales)"],
      downstream:
        "Releases FIFO stock for an order-mode sale at delivery time (status pending_payment/order → completed) via _emit_sale_exit.",
      source: "0005_sales_cash.sql:824",
      status: "live",
    },
    {
      id: "void_sale",
      label: "Void sale",
      module: "sales",
      surface: "admin",
      rpc: "void_sale(p_sale_id uuid, p_reason text)",
      signature: "public.void_sale(p_sale_id uuid, p_reason text) returns public.sales",
      security: "SECURITY DEFINER",
      guard: "assert_staff()",
      writes: ["sales", "warehouse_stock", "inventory_movements", "cash_movements"],
      triggers: ["trg_cashmov_set_base (cash_movements)", "audit_trigger (sales)"],
      downstream:
        "Cancels the sale, returns stock to its lots, posts a reversing kardex entry. In multicurrency (D6) refunds the drawer in base — reverses what actually came in.",
      source: "0007_multicurrency.sql:468",
      status: "live",
    },

    // ---- Credit -------------------------------------------------------------
    {
      id: "register_credit_payment",
      label: "Register credit payment",
      module: "credit",
      surface: "pos",
      rpc: "register_credit_payment(...)",
      signature:
        "public.register_credit_payment(p_sale_id uuid, p_amount numeric, p_payment_method text default 'cash', p_cash_session_id uuid default null) returns public.sales",
      security: "SECURITY DEFINER",
      guard: "assert_staff()",
      writes: ["credit_payments", "sales", "cash_movements"],
      triggers: ["trg_cashmov_set_base (cash_movements)", "audit_trigger (sales)"],
      downstream:
        "Appends an installment against a credit sale, recomputes amount_pending + credit_status, and (if a session is given) posts the tender to the drawer reconciled in base.",
      source: "0007_multicurrency.sql:420",
      status: "live",
    },

    // ---- Quotations ---------------------------------------------------------
    {
      id: "create_quotation",
      label: "Create quotation",
      module: "quotations",
      surface: "pos",
      rpc: "create_quotation(...)",
      signature:
        "public.create_quotation(p_items jsonb, p_client_id uuid default null, p_client_name text default null, p_client_phone text default null, p_discount_amount numeric default 0, p_tax_rate numeric default 0, p_valid_until date default null, p_terms_conditions text default null) returns public.quotations",
      security: "SECURITY DEFINER",
      guard: "assert_staff()",
      writes: ["quotations", "quotation_items"],
      triggers: ["audit_trigger (quotations)"],
      downstream: "Server-priced quote with a sequential number; no stock or cash movement.",
      source: "0005_sales_cash.sql:962",
      status: "live",
    },
    {
      id: "convert_quotation_to_sale",
      label: "Convert quotation → sale",
      module: "quotations",
      surface: "pos",
      rpc: "convert_quotation_to_sale(...)",
      signature:
        "public.convert_quotation_to_sale(p_quotation_id uuid, p_warehouse_id uuid, p_payment_method text default 'cash', p_cash_session_id uuid default null, p_amount_paid numeric default 0) returns public.sales",
      security: "SECURITY DEFINER",
      guard: "assert_staff()",
      writes: [
        "quotations",
        "sales",
        "sale_items",
        "sale_payments",
        "warehouse_stock",
        "inventory_movements",
      ],
      triggers: ["trg_sales_set_base (sales)", "audit_trigger (sales + quotations)"],
      downstream:
        "Copies the quote lines into register_sale (FIFO exit, drawer tender), marks the quote converted and links both records.",
      source: "0007_multicurrency.sql:543",
      status: "live",
    },

    // ---- Returns ------------------------------------------------------------
    {
      id: "register_return",
      label: "Register return",
      module: "returns",
      surface: "pos",
      rpc: "register_return(...)",
      signature:
        "public.register_return(p_sale_id uuid, p_warehouse_id uuid, p_resolution_type text, p_reason text, p_items jsonb, p_cash_session_id uuid default null) returns public.returns",
      security: "SECURITY DEFINER",
      guard: "assert_staff()",
      writes: [
        "returns",
        "return_items",
        "warehouse_stock",
        "inventory_movements",
        "sales",
        "cash_movements",
      ],
      triggers: [
        "trg_returns_set_base (returns)",
        "trg_cashmov_set_base (cash_movements)",
        "audit_trigger (returns + sales)",
      ],
      downstream:
        "D5 hardening: only against a completed/partially_refunded sale; each line validated against the real sale_item and capped by prior returns; restocks good items; posts refund to the drawer in base; sets sale status refunded | partially_refunded.",
      source: "0008_fix_register_return.sql:21",
      status: "live",
    },

    // ---- Web storefront -----------------------------------------------------
    {
      id: "public_warehouses",
      label: "List pickup warehouses",
      module: "web",
      surface: "storefront",
      rpc: "public_warehouses()",
      signature:
        "public.public_warehouses() returns table(name text, address text, city text, phone text)",
      security: "SECURITY DEFINER, stable",
      guard: "none (public)",
      writes: [],
      reads: ["warehouses"],
      triggers: [],
      downstream: "Read-only projection of active warehouses for the storefront picker.",
      source: "0006_web_public.sql:254",
      status: "live",
    },
    {
      id: "create_web_order",
      label: "Create web order",
      module: "web",
      surface: "storefront",
      rpc: "create_web_order(...)",
      signature:
        "public.create_web_order(p_contact_name text, p_contact_phone text, p_delivery_notes text, p_lines jsonb, p_web_customer_id uuid default null, p_idempotency_key uuid default null) returns public.web_orders",
      security: "SECURITY DEFINER",
      guard: "none (public) — server-priced, no inventory mutation",
      writes: ["web_orders", "web_order_items"],
      reads: ["product_units", "measurement_units"],
      triggers: ["web_orders_set_updated_at"],
      downstream:
        "Public but safe: prices come from the catalog, never the client; idempotent by key. Creates no stock/cash effects — staff convert it later.",
      source: "0007_multicurrency.sql:726",
      status: "live",
    },
    {
      id: "update_web_order_status",
      label: "Advance web order status",
      module: "web",
      surface: "admin",
      rpc: "update_web_order_status(p_id uuid, p_status text)",
      signature:
        "public.update_web_order_status(p_id uuid, p_status text) returns public.web_orders",
      security: "SECURITY DEFINER",
      guard: "assert_staff()  — D7 (was anon-reachable in legacy)",
      writes: ["web_orders"],
      triggers: ["web_orders_set_updated_at"],
      downstream:
        "Staff-only status machine: pending → confirmed → preparing → ready → delivered | cancelled.",
      source: "0006_web_public.sql:270",
      status: "live",
    },
    {
      id: "convert_web_order_to_sale",
      label: "Convert web order → sale",
      module: "web",
      surface: "admin",
      rpc: "convert_web_order_to_sale(...)",
      signature:
        "public.convert_web_order_to_sale(p_id uuid, p_warehouse_id uuid, p_payment_method text default 'cash', p_cash_session_id uuid default null) returns public.sales",
      security: "SECURITY DEFINER",
      guard: "assert_staff()  — D1 (was anon-reachable in legacy)",
      writes: [
        "web_orders",
        "web_customers",
        "clients",
        "sales",
        "sale_items",
        "sale_payments",
        "warehouse_stock",
        "inventory_movements",
      ],
      triggers: ["trg_sales_set_base (sales)", "audit_trigger (sales + clients)"],
      downstream:
        "Resolves/creates the client (explicit link → web_customers → phone match → anonymous retail), bills the order through register_sale (FIFO exit), links order↔sale and confirms it.",
      source: "0007_multicurrency.sql:825",
      status: "live",
    },

    // ---- Inventory (PLANNED: no RPC in the migrations yet) ------------------
    {
      id: "stock_entry",
      label: "Receive stock entry",
      module: "inventory",
      surface: "admin",
      rpc: null,
      signature: "— no RPC in migrations (0004 defines tables + comments only)",
      security: "RLS only (is_active_staff)",
      guard: "RLS is_active_staff()",
      writes: ["stock_entries", "stock_entry_items", "warehouse_stock", "inventory_movements"],
      triggers: ["audit_trigger (stock_entries)"],
      downstream:
        "PLANNED. 0004 comments say warehouse_stock lots are 'written by inventory RPCs', but that RPC is not in the migrations yet. Would create FIFO lots and kardex 'entry' rows.",
      source: "0004_inventory.sql (tables only)",
      status: "planned",
    },
    {
      id: "transfer",
      label: "Inter-warehouse transfer",
      module: "inventory",
      surface: "admin",
      rpc: null,
      signature:
        "— no RPC in migrations (transfer_number is 'assigned by the transfer RPC', absent)",
      security: "RLS only (is_active_staff)",
      guard: "RLS is_active_staff()",
      writes: [
        "transfers",
        "transfer_items",
        "transfer_lots",
        "warehouse_stock",
        "inventory_movements",
      ],
      triggers: ["audit_trigger (transfers)"],
      downstream:
        "PLANNED. Lifecycle draft → sent (stock moves into transfer_lots, in transit) → closed (received). RPC not yet in the migrations.",
      source: "0004_inventory.sql (tables only)",
      status: "planned",
    },
    {
      id: "defective_relocate",
      label: "Defective / relocate",
      module: "inventory",
      surface: "admin",
      rpc: null,
      signature: "— no RPC in migrations",
      security: "RLS only (is_active_staff)",
      guard: "RLS is_active_staff()",
      writes: ["warehouse_stock", "inventory_movements"],
      triggers: [],
      downstream:
        "PLANNED. Kardex supports 'defective' and adjustment movement types; the write path (RPC) is not in the migrations yet.",
      source: "0004_inventory.sql (movement_type enum)",
      status: "planned",
    },
  ],
};
