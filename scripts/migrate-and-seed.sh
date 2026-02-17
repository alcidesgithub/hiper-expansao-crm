#!/bin/sh
set -e

MAX_RETRIES="${MIGRATION_MAX_RETRIES:-30}"
RETRY_DELAY_SECONDS="${MIGRATION_RETRY_DELAY_SECONDS:-2}"
CURRENT_ATTEMPT=1

echo "Starting migration script..."
echo "Waiting for database..."

while ! npx prisma migrate deploy; do
  if [ "$CURRENT_ATTEMPT" -ge "$MAX_RETRIES" ]; then
    echo "Migration failed after ${MAX_RETRIES} attempts."
    exit 1
  fi

  echo "Database not ready yet. Retry ${CURRENT_ATTEMPT}/${MAX_RETRIES} in ${RETRY_DELAY_SECONDS}s..."
  CURRENT_ATTEMPT=$((CURRENT_ATTEMPT + 1))
  sleep "$RETRY_DELAY_SECONDS"
done

echo "Migration successful."
echo "Starting seed..."
npx prisma db seed
echo "Seed finished."