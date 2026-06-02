
## $(date +%Y-%m-%d) - Prevent SQL Injection via SQLAlchemy String Interpolation
**Vulnerability:** Found a SQL injection vulnerability in `BatchMigrationManager.migrate_table_in_batches` where `table_name` and `id_column` variables were interpolated directly into a raw SQL query using python f-strings inside a `text()` block.
**Learning:** Even when using modern ORMs like SQLAlchemy, wrapping raw f-strings in `text()` bypasses parameterized query protections. This allows an attacker who controls the `table_name` variable to execute arbitrary SQL statements (e.g. `users; UPDATE ...`).
**Prevention:** Never use f-strings or `.format()` to inject dynamic table or column identifiers into `text()`. Always construct dynamic queries utilizing SQLAlchemy's core abstractions, such as `table()`, `column()`, and `select()`, which natively and safely escape dynamic identifiers.
