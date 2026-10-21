-- ER viewer schema introspection.
-- Returns the full public-schema shape (tables, columns, PK/FK flags, relations)
-- as a single JSON object. Run it against the live DB and write the result into
-- schema.js (see README.md). This is the only source of truth for the viewer, so
-- the diagram can never drift from the real database.

with pk as (
  select kcu.table_name, kcu.column_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
   and kcu.table_schema = tc.table_schema
  where tc.constraint_type = 'PRIMARY KEY'
    and tc.table_schema = 'public'
),
fk as (
  select
    kcu.table_name  as source_table,
    kcu.column_name as source_column,
    ccu.table_name  as target_table,
    ccu.column_name as target_column
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
   and kcu.table_schema = tc.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
)
select json_build_object(
  'generated_at', now(),
  'tables', coalesce((
    select json_agg(tbl order by tbl->>'name')
    from (
      select json_build_object(
        'name', t.table_name,
        'description', obj_description(('public.' || quote_ident(t.table_name))::regclass, 'pg_class'),
        'columns', coalesce((
          select json_agg(
            json_build_object(
              'name', c.column_name,
              'type', c.data_type,
              'nullable', (c.is_nullable = 'YES'),
              'pk', (pk.column_name is not null),
              'fk', (fk.source_column is not null),
              'description', col_description(('public.' || quote_ident(c.table_name))::regclass, c.ordinal_position)
            )
            order by c.ordinal_position
          )
          from information_schema.columns c
          left join pk on pk.table_name = c.table_name and pk.column_name = c.column_name
          left join fk on fk.source_table = c.table_name and fk.source_column = c.column_name
          where c.table_schema = 'public' and c.table_name = t.table_name
        ), '[]'::json)
      ) as tbl
      from information_schema.tables t
      where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
    ) s
  ), '[]'::json),
  'relations', coalesce((
    select json_agg(
      json_build_object(
        'source_table', source_table,
        'source_column', source_column,
        'target_table', target_table,
        'target_column', target_column
      )
    )
    from fk
  ), '[]'::json)
) as schema;
