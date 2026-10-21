# ER viewer

Interactive entity–relationship viewer for the x-kairos database. It renders the
**real** schema — tables, columns, PK/FK flags and foreign-key relations — so the
diagram can never drift from the database.

- `index.html` — the viewer (single file: inline CSS + JS, graph engine via CDN).
- `schema.js` — the data, auto-generated from the live DB. **Never edit by hand.**
- `introspect.sql` — the query that produces the schema as JSON.

## View it

Open `index.html` in a browser. It reads `schema.js` locally (no server needed).

## Regenerate `schema.js` from the live DB

`introspect.sql` returns a single JSON object. Run it against the linked database,
then wrap the result as the `window.__SCHEMA__` assignment in `schema.js`.

Via the Supabase MCP (read-only) or any SQL console: run the contents of
`introspect.sql`, copy the returned JSON, and paste it so `schema.js` becomes:

```js
// AUTO-GENERATED — do not edit by hand.
window.__SCHEMA__ = <paste the JSON here>;
```

Via `psql` (requires the Postgres client and the DB connection string):

```bash
printf 'window.__SCHEMA__ = ' > schema.js
psql "$DATABASE_URL" -t -A -f introspect.sql >> schema.js
printf ';\n' >> schema.js
```

Commit the updated `schema.js`. The commit history is the historical record of how
the schema grew, module by module.

## History

Git is the history engine — no custom snapshot machinery. `git log -p schema.js`
shows every schema change over time; checking out an older commit shows the ER as
it was then.
