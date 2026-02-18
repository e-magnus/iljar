#!/bin/bash

# Daily PostgreSQL backup script for iljar
# This script creates a compressed backup of the PostgreSQL database

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/iljar}"
DB_NAME="${DB_NAME:-iljar_dev}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/iljar_backup_$TIMESTAMP.sql.gz"

# Create backup
echo "Starting backup at $(date)"
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --verbose \
  | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
  echo "Backup completed successfully: $BACKUP_FILE"
  
  # Calculate backup size
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup size: $SIZE"
  
  # Remove backups older than retention period
  echo "Removing backups older than $RETENTION_DAYS days..."
  find "$BACKUP_DIR" -name "iljar_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
  
  echo "Backup process completed at $(date)"
  exit 0
else
  echo "ERROR: Backup failed!"
  exit 1
fi
