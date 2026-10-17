#!/bin/bash
# Database Backup Script for Fintech Innovation Portal (Section 18)
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="fintech_portal"
DB_USER="postgres"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql"

mkdir -p ${BACKUP_DIR}

echo "[$(date)] Starting PostgreSQL database backup..."
docker exec -t fintech_postgres pg_dump -U ${DB_USER} ${DB_NAME} > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
  echo "[$(date)] Backup completed successfully: ${BACKUP_FILE}"
  # Retain only the last 14 days of backups
  find ${BACKUP_DIR} -type f -name "*.sql" -mtime +14 -exec rm {} \;
else
  echo "[$(date)] Database backup failed!" >&2
  exit 1
fi
