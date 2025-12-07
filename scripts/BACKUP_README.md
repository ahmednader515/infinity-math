# Database Backup Script

This script allows you to create a backup of your PostgreSQL database.

## Prerequisites

1. **PostgreSQL Client Tools**: You need `pg_dump` installed on your system.
   - On Windows, you can install it via [PostgreSQL installer](https://www.postgresql.org/download/windows/)
   - Or use a package manager like Chocolatey: `choco install postgresql`
   - Make sure `pg_dump` is in your system PATH

2. **Environment Variables**: The script reads database connection from:
   - `DATABASE_URL` environment variable, or
   - `DIRECT_DATABASE_URL` environment variable, or
   - `.env` file in the project root

## Usage

### Option 1: Using npm script (Recommended)
```powershell
npm run backup:db
```

### Option 2: Direct PowerShell execution
```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup-db.ps1
```

## Output

- Backups are saved in the `backups/` directory
- Each backup file is named: `backup_YYYY-MM-DD_HH-mm-ss.sql`
- The backup file contains a complete SQL dump of your database

## Example

After running the backup, you'll see output like:
```
Starting database backup...
Database: my_database
Host: localhost:5432
Backup file: backups\backup_2024-01-15_14-30-45.sql

✓ Backup completed successfully!
  File: backups\backup_2024-01-15_14-30-45.sql
  Size: 2.45 MB
```

## Restoring a Backup

To restore a backup, you can use `psql`:

```powershell
psql -h HOST -p PORT -U USERNAME -d DATABASE_NAME -f backups\backup_YYYY-MM-DD_HH-mm-ss.sql
```

Or using the DATABASE_URL:
```powershell
# Parse your DATABASE_URL and use psql with the connection details
psql "postgresql://user:password@host:port/database" -f backups\backup_YYYY-MM-DD_HH-mm-ss.sql
```

## Notes

- The `backups/` directory is automatically created if it doesn't exist
- The `backups/` directory is ignored by git (added to .gitignore)
- Backups are in plain SQL format for easy reading and restoration
- The script uses `--no-owner` and `--no-acl` flags to avoid permission issues when restoring

