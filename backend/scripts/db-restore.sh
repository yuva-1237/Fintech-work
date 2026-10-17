#!/bin/bash
# Database Restore Script for Fintech Innovation Portal (Section 18)
if [ -z "$1" ]; then
  echo "Usage: ./scripts/db-restore.sh <path_to_backup_file.sql>"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="fintech_portal"
DB_USER="postgres"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "[$(date)] Starting PostgreSQL database restore from $BACKUP_FILE..."
cat "$BACKUP_FILE" | docker exec -i fintech_postgres psql -U "$DB_USER" -d "$DB_NAME"

if [ $? -eq 0 ]; then
  echo "[$(date)] Database restoration completed successfully."
else
  echo "[$(date)] Database restoration failed!" >&2
  exit 1
fi
