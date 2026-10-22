// PROPOSAL — phase 1 (Foundation + Catalog), pending apply.
// NOT generated from the live DB yet. After migrations 0002/0003 land, regenerate
// this file from the real database with introspect.sql (see README.md).
// Descriptions come from COMMENT ON TABLE/COLUMN once the schema exists.
// Inventory (phase 2) is tracked in its own issue and re-added there.
window.__SCHEMA__ = {
  "generated_at": "PROPOSAL — phase 1 (Foundation + Catalog), pending apply",
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
    { "source_table": "product_price_tiers", "source_column": "product_unit_id", "target_table": "product_units", "target_column": "id" }
  ]
};
