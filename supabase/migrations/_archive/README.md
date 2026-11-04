# Archived Migrations

These migration files were archived per Fix Pass E instructions on 3 Nov 2026 and must NOT be executed against the database:

- `004_data_migration_template.sql`: Contains an unapplied one-off template with placeholder UUID (`'YOUR-USER-UUID-HERE'`) meant for manual single-user data backfills.
- `999_ensure_all_columns_and_reload_cache.sql`: A monolithic legacy catch-all script that duplicated older DDL and recreated stale views without proper user isolation.

All schema reconciliation is handled deterministically by `014_reconcile_live_schema.sql` onwards.

