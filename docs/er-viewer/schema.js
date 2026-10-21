// PROPOSAL — phase 0 (Foundation), pending review/approval.
// NOT generated from the live DB yet. After migration #13 lands, regenerate
// this file from the real database with introspect.sql (see README.md).
// Descriptions come from COMMENT ON TABLE/COLUMN once the schema exists.
window.__SCHEMA__ = {
  "generated_at": "PROPOSAL — phase 0 (pending migration #13)",
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
    }
  ],
  "relations": [
    { "source_table": "staff_roles", "source_column": "staff_id", "target_table": "staff", "target_column": "id" },
    { "source_table": "staff_roles", "source_column": "role_id", "target_table": "roles", "target_column": "id" }
  ]
};
