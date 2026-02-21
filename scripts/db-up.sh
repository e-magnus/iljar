#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="iljar-postgres"
DB_IMAGE="postgres:16-alpine"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="iljar_dev"
DB_PORT="5432"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker vantar á PATH. Settu Docker upp og reyndu aftur."
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  docker start "$CONTAINER_NAME" >/dev/null || true
  echo "Postgres container ræstur: $CONTAINER_NAME"
else
  docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "$DB_PORT":5432 \
    "$DB_IMAGE" >/dev/null
  echo "Postgres container stofnaður og ræstur: $CONTAINER_NAME"
fi

until docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep 1
done

echo "Postgres tilbúið á localhost:$DB_PORT"

echo "Keyri migrations..."
npx prisma migrate deploy

echo "Endurnýja Prisma client..."
npx prisma generate

echo "Búið: DB online + migrations keyrðar"
