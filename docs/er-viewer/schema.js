// PROPOSAL — phases 1-2 (Foundation + Catalog + Inventory), pending apply.
// NOT generated from the live DB yet. After the migrations land, regenerate
// this file from the real database with introspect.sql (see README.md).
// Descriptions come from COMMENT ON TABLE/COLUMN once the schema exists.
window.__SCHEMA__ = {
  "generated_at": "PROPOSAL — phases 1-2 (Foundation + Catalog + Inventory), pending apply",
  "tables": [
    {
      "name": "staff",
      "description": "Back-office operator. One row per internal user; id matches the Supabase Auth user (auth.users owns the credentials).",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": true, "description": "Primary key; same uuid as auth.users.id." },
        { "name": "full_name", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Display name shown in the admin UI." },
        { "name": "is_active", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "If false, the account is disabled without deleting its history." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the staff record was created." }
      ]
    },
    {
      "name": "roles",
      "description": "Catalog of operational roles (e.g. admin, cashier). Drives authorization.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "key", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Stable machine key used in code/policies, e.g. 'admin', 'cashier'." },
        { "name": "label", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Human-readable name shown in the UI." }
      ]
    },
    {
      "name": "staff_roles",
      "description": "Bridge table: which roles each staff member holds (many-to-many).",
      "columns": [
        { "name": "staff_id", "type": "uuid", "nullable": false, "pk": true, "fk": true, "description": "FK to staff.id; part of the composite primary key." },
        { "name": "role_id", "type": "uuid", "nullable": false, "pk": true, "fk": true, "description": "FK to roles.id; part of the composite primary key." },
        { "name": "granted_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the role was granted to the staff member." }
      ]
    },
    {
      "name": "measurement_units",
      "description": "Sellable units a product can be priced in (unit, box, pack, ...). Reference data; admin-maintained.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "name", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Unique unit name shown in the UI, e.g. 'unidad', 'caja'." },
        { "name": "is_base", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "Marks the atomic unit (conversion_factor 1) the others convert to." },
        { "name": "sort_order", "type": "integer", "nullable": false, "pk": false, "fk": false, "description": "Display order in pickers." },
        { "name": "is_active", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "If false, hidden from new product configuration." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the unit was created." }
      ]
    },
    {
      "name": "categories",
      "description": "Product categories as a tree; parent_id nests subcategories. Storefront navigation and filtering.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "name", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Display name; not globally unique (same name allowed under different parents)." },
        { "name": "slug", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "URL-safe unique identifier for storefront routes." },
        { "name": "description", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional long text for the category page." },
        { "name": "parent_id", "type": "uuid", "nullable": true, "pk": false, "fk": true, "description": "Parent category; null for roots. RESTRICT: a category with children cannot be deleted." },
        { "name": "sort_order", "type": "integer", "nullable": false, "pk": false, "fk": false, "description": "Display order among siblings." },
        { "name": "is_active", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "If false, hidden from navigation without losing history." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the category was created." },
        { "name": "updated_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "Last modification; maintained by trigger." }
      ]
    },
    {
      "name": "brands",
      "description": "Product brands/manufacturers. Optional product metadata and a storefront filter.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "name", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Unique brand name." },
        { "name": "slug", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "URL-safe unique identifier for storefront routes." },
        { "name": "is_active", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "If false, hidden from filters without losing history." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the brand was created." },
        { "name": "updated_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "Last modification; maintained by trigger." }
      ]
    },
    {
      "name": "products",
      "description": "Catalog products. Pricing lives in product_units; stock and promotions are out of this domain.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "sku", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Internal stock-keeping unit; unique, human-entered." },
        { "name": "barcode", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional scannable barcode/EAN; unique when present." },
        { "name": "name", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Display name." },
        { "name": "slug", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "URL-safe unique identifier for storefront routes." },
        { "name": "description", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Long marketing/spec text." },
        { "name": "category_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "FK to categories; required. RESTRICT: cannot delete a category that still has products." },
        { "name": "brand_id", "type": "uuid", "nullable": true, "pk": false, "fk": true, "description": "Optional FK to brands; SET NULL on brand deletion." },
        { "name": "model", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional model/reference code." },
        { "name": "color", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional color attribute." },
        { "name": "size", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional size attribute." },
        { "name": "is_active", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "If false, hidden everywhere without losing history." },
        { "name": "is_featured", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "Highlights the product on the storefront home." },
        { "name": "is_web_visible", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "Gate for storefront exposure (consumed by the public-read policy in a later migration)." },
        { "name": "notes", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Internal back-office notes; never shown to customers." },
        { "name": "cost", "type": "numeric(16,4)", "nullable": false, "pk": false, "fk": false, "description": "Latest unit cost in the store base currency; drives margin and stock valuation. Maintained by inventory receiving." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the product was created." },
        { "name": "updated_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "Last modification; maintained by trigger." }
      ]
    },
    {
      "name": "product_images",
      "description": "Gallery images for a product; one row per image. Ordered by sort_order, with a single primary (cover).",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "product_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "FK to products; CASCADE so images vanish with the product." },
        { "name": "url", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Public URL of the stored image." },
        { "name": "alt", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Alternative text for accessibility; required (never show an image without it)." },
        { "name": "sort_order", "type": "integer", "nullable": false, "pk": false, "fk": false, "description": "Display order within the gallery." },
        { "name": "is_primary", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "Marks the cover image. At most one per product." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the image was added." },
        { "name": "updated_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "Last modification; maintained by trigger." }
      ]
    },
    {
      "name": "product_units",
      "description": "Each way a product can be sold: a (product, unit) pair with its conversion and base prices. Prices are in the store's default currency (multi-currency is a later issue).",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "product_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "FK to products; CASCADE so units vanish with the product." },
        { "name": "unit_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "FK to measurement_units; RESTRICT so a unit in use cannot be deleted." },
        { "name": "conversion_factor", "type": "numeric(12,3)", "nullable": false, "pk": false, "fk": false, "description": "How many base units this unit represents (e.g. a box of 12 = 12). Must be > 0." },
        { "name": "retail_price", "type": "numeric(12,2)", "nullable": true, "pk": false, "fk": false, "description": "Per-unit retail price; null while pending configuration." },
        { "name": "wholesale_price", "type": "numeric(12,2)", "nullable": true, "pk": false, "fk": false, "description": "Per-unit wholesale price; null if not offered." },
        { "name": "is_default", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "The unit preselected in POS/storefront. At most one per product." },
        { "name": "is_active", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "If false, this unit is not sellable." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the unit pricing was created." },
        { "name": "updated_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "Last modification; maintained by trigger." }
      ]
    },
    {
      "name": "product_price_tiers",
      "description": "Quantity-break pricing for a product unit: buy >= min_quantity, pay unit_price.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "product_unit_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "FK to product_units; CASCADE with the unit." },
        { "name": "min_quantity", "type": "integer", "nullable": false, "pk": false, "fk": false, "description": "Lowest quantity that unlocks this tier; >= 1." },
        { "name": "unit_price", "type": "numeric(12,2)", "nullable": false, "pk": false, "fk": false, "description": "Per-unit price at this tier; must be > 0." },
        { "name": "label", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional display label, e.g. 'Mayorista'." },
        { "name": "is_active", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "If false, the tier is ignored." },
        { "name": "sort_order", "type": "integer", "nullable": false, "pk": false, "fk": false, "description": "Display order among tiers." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the tier was created." },
        { "name": "updated_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "Last modification; maintained by trigger." }
      ]
    },
    {
      "name": "warehouses",
      "description": "Stock-holding locations (branches/warehouses). One is marked default for new operations.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "name", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Display name." },
        { "name": "code", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional short code; unique when present." },
        { "name": "address", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional street address." },
        { "name": "city", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional city." },
        { "name": "phone", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional contact phone." },
        { "name": "responsible_id", "type": "uuid", "nullable": true, "pk": false, "fk": true, "description": "Staff member in charge; SET NULL if that staff row is removed." },
        { "name": "is_active", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "If false, hidden from new operations without losing history." },
        { "name": "is_default", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "Preselected warehouse. At most one default." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the warehouse was created." },
        { "name": "updated_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "Last modification; maintained by trigger." }
      ]
    },
    {
      "name": "warehouse_locations",
      "description": "Positions inside a warehouse (aisle / shelf / bin); parent_id nests them. Stock and movements can be pinned to a location.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "warehouse_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "FK to warehouses; CASCADE so locations vanish with the warehouse." },
        { "name": "parent_id", "type": "uuid", "nullable": true, "pk": false, "fk": true, "description": "Parent location; null for roots. SET NULL on parent deletion (child reparented to root)." },
        { "name": "name", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Display name within the warehouse." },
        { "name": "code", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional short code." },
        { "name": "sort_order", "type": "integer", "nullable": false, "pk": false, "fk": false, "description": "Display order among siblings." },
        { "name": "is_active", "type": "boolean", "nullable": false, "pk": false, "fk": false, "description": "If false, hidden from new placement without losing history." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the location was created." },
        { "name": "updated_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "Last modification; maintained by trigger." }
      ]
    },
    {
      "name": "stock_entries",
      "description": "Receiving document header: goods coming into a warehouse. Lifecycle draft -> closed -> (cancelled). Closing materializes stock and movements.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "entry_number", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Human-facing sequential number (e.g. ING-000001); assigned by the receiving RPC. Unique." },
        { "name": "reference", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional external reference, e.g. a supplier invoice." },
        { "name": "warehouse_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Destination warehouse. RESTRICT: a warehouse with entries cannot be deleted." },
        { "name": "status", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "draft (editable), closed (stock applied), or cancelled." },
        { "name": "dim_number", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional import-declaration number." },
        { "name": "dim_document_url", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional URL of the stored import-declaration document." },
        { "name": "entry_date", "type": "date", "nullable": false, "pk": false, "fk": false, "description": "Business date of the entry." },
        { "name": "total_items", "type": "integer", "nullable": false, "pk": false, "fk": false, "description": "Cached line count; maintained by the receiving RPC." },
        { "name": "total_units", "type": "numeric(16,2)", "nullable": false, "pk": false, "fk": false, "description": "Cached total base units received." },
        { "name": "total_boxes", "type": "numeric(16,2)", "nullable": false, "pk": false, "fk": false, "description": "Cached total boxes received." },
        { "name": "notes", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Free-form notes." },
        { "name": "created_by", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Staff member who created the entry. RESTRICT to preserve authorship." },
        { "name": "cancelled_at", "type": "timestamptz", "nullable": true, "pk": false, "fk": false, "description": "When the entry was cancelled; null while active." },
        { "name": "cancelled_by", "type": "uuid", "nullable": true, "pk": false, "fk": true, "description": "Staff member who cancelled it; SET NULL if removed." },
        { "name": "cancelled_reason", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Why it was cancelled." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the entry was created." },
        { "name": "updated_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "Last modification; maintained by trigger." }
      ]
    },
    {
      "name": "stock_entry_items",
      "description": "One received product line. Each closed line becomes a stock lot (warehouse_stock) tracked FIFO by its id. Cost is in the store base currency.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key; also the FIFO lot identifier once stock is materialized." },
        { "name": "stock_entry_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "FK to stock_entries; CASCADE with the header." },
        { "name": "product_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Received product. RESTRICT to keep receiving history consistent." },
        { "name": "unit_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Unit the quantity is expressed in. RESTRICT so a unit in use cannot be deleted." },
        { "name": "quantity", "type": "numeric(16,2)", "nullable": false, "pk": false, "fk": false, "description": "Quantity received in the chosen unit; must be > 0." },
        { "name": "units_per_box", "type": "numeric(14,2)", "nullable": true, "pk": false, "fk": false, "description": "Base units per received unit (conversion factor); > 0 when present." },
        { "name": "location_id", "type": "uuid", "nullable": true, "pk": false, "fk": true, "description": "Optional destination location; SET NULL if removed." },
        { "name": "unit_cost", "type": "numeric(16,4)", "nullable": false, "pk": false, "fk": false, "description": "Per-unit cost in the store base currency; must be >= 0." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the line was created." },
        { "name": "updated_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "Last modification; maintained by trigger." }
      ]
    },
    {
      "name": "warehouse_stock",
      "description": "Live stock, one row per FIFO lot: a (warehouse, product, source lot, location) slice with its remaining quantity. Exits consume oldest rows first.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "warehouse_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Holding warehouse. RESTRICT to protect stock history." },
        { "name": "product_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Stocked product. RESTRICT to protect stock history." },
        { "name": "stock_entry_item_id", "type": "uuid", "nullable": true, "pk": false, "fk": true, "description": "Source receiving line (lot origin); SET NULL if removed. Drives FIFO ordering and costing." },
        { "name": "location_id", "type": "uuid", "nullable": true, "pk": false, "fk": true, "description": "Optional position inside the warehouse; SET NULL if removed." },
        { "name": "quantity", "type": "numeric(16,2)", "nullable": false, "pk": false, "fk": false, "description": "Remaining base units in this lot; must be >= 0." },
        { "name": "min_stock", "type": "numeric(16,2)", "nullable": false, "pk": false, "fk": false, "description": "Reorder threshold for alerts; must be >= 0." },
        { "name": "stock_type", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "retail, lot or wholesale bucket this lot belongs to." },
        { "name": "last_count_date", "type": "timestamptz", "nullable": true, "pk": false, "fk": false, "description": "When this lot was last physically counted." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the lot entered stock; part of the FIFO sort key." },
        { "name": "updated_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "Last modification; maintained by trigger." }
      ]
    },
    {
      "name": "inventory_movements",
      "description": "Append-only kardex: one row per stock movement. Written only by inventory RPCs; never updated or deleted (RLS: insert + select only).",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "product_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Moved product. RESTRICT to protect the ledger." },
        { "name": "warehouse_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Warehouse the movement happened in. RESTRICT to protect the ledger." },
        { "name": "movement_type", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "entry, exit, transfer_in/out, adjustment_plus/minus, return or defective." },
        { "name": "quantity", "type": "numeric(16,2)", "nullable": false, "pk": false, "fk": false, "description": "Base units moved; always positive (direction is in movement_type)." },
        { "name": "unit_name", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Unit label snapshot at the time of the movement." },
        { "name": "reference_type", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Kind of source document, e.g. stock_entry, transfer, sale, defective." },
        { "name": "reference_id", "type": "uuid", "nullable": true, "pk": false, "fk": false, "description": "Id of the source document; no FK (polymorphic across domains)." },
        { "name": "notes", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional free-form note, e.g. a relocation path." },
        { "name": "created_by", "type": "uuid", "nullable": true, "pk": false, "fk": true, "description": "Staff member who triggered it; SET NULL if removed." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the movement was recorded." }
      ]
    },
    {
      "name": "transfers",
      "description": "Inter-warehouse transfer header. Lifecycle draft -> sent (in transit) -> closed (received); cancellable. Source stock moves into transfer_lots while in transit.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "transfer_number", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Human-facing sequential number (e.g. TRA-000001); assigned by the transfer RPC. Unique." },
        { "name": "from_warehouse_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Origin warehouse. RESTRICT to protect transfer history." },
        { "name": "to_warehouse_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Destination warehouse. RESTRICT to protect transfer history." },
        { "name": "status", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "draft (editable), sent (in transit), closed (received) or cancelled." },
        { "name": "reason", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Why the transfer was raised." },
        { "name": "requested_by", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Staff member who requested it. RESTRICT to preserve authorship." },
        { "name": "requested_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When it was requested." },
        { "name": "sent_at", "type": "timestamptz", "nullable": true, "pk": false, "fk": false, "description": "When stock was dispatched (draft -> sent); null until then." },
        { "name": "received_at", "type": "timestamptz", "nullable": true, "pk": false, "fk": false, "description": "When stock was received (sent -> closed); null until then." },
        { "name": "notes", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Free-form notes." },
        { "name": "created_by", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Staff member who created the record. RESTRICT to preserve authorship." },
        { "name": "cancelled_at", "type": "timestamptz", "nullable": true, "pk": false, "fk": false, "description": "When it was cancelled; null while active." },
        { "name": "cancelled_by", "type": "uuid", "nullable": true, "pk": false, "fk": true, "description": "Staff member who cancelled it; SET NULL if removed." },
        { "name": "cancelled_reason", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Why it was cancelled." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the transfer was created." },
        { "name": "updated_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "Last modification; maintained by trigger." }
      ]
    },
    {
      "name": "transfer_items",
      "description": "Requested lines of a transfer: how much of each product to move. Actual FIFO lots moved are tracked in transfer_lots.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "transfer_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "FK to transfers; CASCADE with the header." },
        { "name": "product_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Product to move. RESTRICT to keep the request consistent." },
        { "name": "quantity", "type": "numeric(16,2)", "nullable": false, "pk": false, "fk": false, "description": "Requested base units; must be > 0." },
        { "name": "unit_name", "type": "text", "nullable": false, "pk": false, "fk": false, "description": "Unit label snapshot for the request." },
        { "name": "to_location_id", "type": "uuid", "nullable": true, "pk": false, "fk": true, "description": "Optional destination location at the target warehouse; SET NULL if removed." },
        { "name": "notes", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "Optional line note." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the line was created." }
      ]
    },
    {
      "name": "transfer_lots",
      "description": "FIFO lots dispatched but not yet received (status sent). Preserves each lot origin and type so stock is never duplicated in transit.",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "pk": true, "fk": false, "description": "Primary key." },
        { "name": "transfer_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "FK to transfers; CASCADE with the header." },
        { "name": "product_id", "type": "uuid", "nullable": false, "pk": false, "fk": true, "description": "Product in transit. RESTRICT to keep the in-transit record consistent." },
        { "name": "stock_entry_item_id", "type": "uuid", "nullable": true, "pk": false, "fk": true, "description": "Source FIFO lot; SET NULL if the line is removed." },
        { "name": "stock_type", "type": "text", "nullable": true, "pk": false, "fk": false, "description": "retail, lot or wholesale bucket carried from the source lot." },
        { "name": "quantity", "type": "numeric(16,2)", "nullable": false, "pk": false, "fk": false, "description": "Base units in transit for this lot; must be > 0." },
        { "name": "created_at", "type": "timestamptz", "nullable": false, "pk": false, "fk": false, "description": "When the lot was dispatched." }
      ]
    }
  ],
  "relations": [
    { "source_table": "staff_roles", "source_column": "staff_id", "target_table": "staff", "target_column": "id" },
    { "source_table": "staff_roles", "source_column": "role_id", "target_table": "roles", "target_column": "id" },
    { "source_table": "categories", "source_column": "parent_id", "target_table": "categories", "target_column": "id" },
    { "source_table": "products", "source_column": "category_id", "target_table": "categories", "target_column": "id" },
    { "source_table": "products", "source_column": "brand_id", "target_table": "brands", "target_column": "id" },
    { "source_table": "product_images", "source_column": "product_id", "target_table": "products", "target_column": "id" },
    { "source_table": "product_units", "source_column": "product_id", "target_table": "products", "target_column": "id" },
    { "source_table": "product_units", "source_column": "unit_id", "target_table": "measurement_units", "target_column": "id" },
    { "source_table": "product_price_tiers", "source_column": "product_unit_id", "target_table": "product_units", "target_column": "id" },
    { "source_table": "warehouses", "source_column": "responsible_id", "target_table": "staff", "target_column": "id" },
    { "source_table": "warehouse_locations", "source_column": "warehouse_id", "target_table": "warehouses", "target_column": "id" },
    { "source_table": "warehouse_locations", "source_column": "parent_id", "target_table": "warehouse_locations", "target_column": "id" },
    { "source_table": "stock_entries", "source_column": "warehouse_id", "target_table": "warehouses", "target_column": "id" },
    { "source_table": "stock_entries", "source_column": "created_by", "target_table": "staff", "target_column": "id" },
    { "source_table": "stock_entries", "source_column": "cancelled_by", "target_table": "staff", "target_column": "id" },
    { "source_table": "stock_entry_items", "source_column": "stock_entry_id", "target_table": "stock_entries", "target_column": "id" },
    { "source_table": "stock_entry_items", "source_column": "product_id", "target_table": "products", "target_column": "id" },
    { "source_table": "stock_entry_items", "source_column": "unit_id", "target_table": "measurement_units", "target_column": "id" },
    { "source_table": "stock_entry_items", "source_column": "location_id", "target_table": "warehouse_locations", "target_column": "id" },
    { "source_table": "warehouse_stock", "source_column": "warehouse_id", "target_table": "warehouses", "target_column": "id" },
    { "source_table": "warehouse_stock", "source_column": "product_id", "target_table": "products", "target_column": "id" },
    { "source_table": "warehouse_stock", "source_column": "stock_entry_item_id", "target_table": "stock_entry_items", "target_column": "id" },
    { "source_table": "warehouse_stock", "source_column": "location_id", "target_table": "warehouse_locations", "target_column": "id" },
    { "source_table": "inventory_movements", "source_column": "product_id", "target_table": "products", "target_column": "id" },
    { "source_table": "inventory_movements", "source_column": "warehouse_id", "target_table": "warehouses", "target_column": "id" },
    { "source_table": "inventory_movements", "source_column": "created_by", "target_table": "staff", "target_column": "id" },
    { "source_table": "transfers", "source_column": "from_warehouse_id", "target_table": "warehouses", "target_column": "id" },
    { "source_table": "transfers", "source_column": "to_warehouse_id", "target_table": "warehouses", "target_column": "id" },
    { "source_table": "transfers", "source_column": "requested_by", "target_table": "staff", "target_column": "id" },
    { "source_table": "transfers", "source_column": "created_by", "target_table": "staff", "target_column": "id" },
    { "source_table": "transfers", "source_column": "cancelled_by", "target_table": "staff", "target_column": "id" },
    { "source_table": "transfer_items", "source_column": "transfer_id", "target_table": "transfers", "target_column": "id" },
    { "source_table": "transfer_items", "source_column": "product_id", "target_table": "products", "target_column": "id" },
    { "source_table": "transfer_items", "source_column": "to_location_id", "target_table": "warehouse_locations", "target_column": "id" },
    { "source_table": "transfer_lots", "source_column": "transfer_id", "target_table": "transfers", "target_column": "id" },
    { "source_table": "transfer_lots", "source_column": "product_id", "target_table": "products", "target_column": "id" },
    { "source_table": "transfer_lots", "source_column": "stock_entry_item_id", "target_table": "stock_entry_items", "target_column": "id" }
  ]
};
