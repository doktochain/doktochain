#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"
AUTH_SQL="$SCRIPT_DIR/../sql/auth-compatibility.sql"

if [ -z "${DB_HOST:-}" ] || [ -z "${DB_NAME:-}" ] || [ -z "${DB_USER:-}" ]; then
  echo "Usage: DB_HOST=<host> DB_NAME=<name> DB_USER=<user> DB_PASSWORD=<pass> $0"
  echo ""
  echo "Or use AWS Secrets Manager:"
  echo "  DB_SECRET_ARN=<arn> DB_HOST=<rds-proxy-endpoint> $0"
  exit 1
fi

PSQL_CMD="psql -h $DB_HOST -U $DB_USER -d $DB_NAME"

if [ -n "${DB_PASSWORD:-}" ]; then
  export PGPASSWORD="$DB_PASSWORD"
fi

echo "=== DoktoChain Schema Migration ==="
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"
echo ""

echo "Step 1: Applying auth compatibility layer..."
$PSQL_CMD -f "$AUTH_SQL"
echo "  Done."

echo ""
echo "Step 2: Creating migration tracking table..."
$PSQL_CMD -c "
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz DEFAULT now(),
    checksum text
  );
"
echo "  Done."

echo ""
echo "Step 3: Applying schema migrations..."

MIGRATION_FILES=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)
TOTAL=$(echo "$MIGRATION_FILES" | wc -l | tr -d ' ')
CURRENT=0
SKIPPED=0
APPLIED=0
FAILED=0
ALREADY_APPLIED=0

for migration in $MIGRATION_FILES; do
  CURRENT=$((CURRENT + 1))
  FILENAME=$(basename "$migration")

  ALREADY_DONE=$($PSQL_CMD -t -c "SELECT count(*) FROM schema_migrations WHERE filename = '$FILENAME';" | tr -d ' ')
  if [ "$ALREADY_DONE" -gt 0 ]; then
    echo "  [$CURRENT/$TOTAL] Already applied: $FILENAME"
    ALREADY_APPLIED=$((ALREADY_APPLIED + 1))
    continue
  fi

  if grep -q "supabase_realtime" "$migration" 2>/dev/null; then
    echo "  [$CURRENT/$TOTAL] Skipping (realtime-specific): $FILENAME"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if grep -q "storage.buckets" "$migration" 2>/dev/null; then
    echo "  [$CURRENT/$TOTAL] Skipping (storage-specific): $FILENAME"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "  [$CURRENT/$TOTAL] Applying: $FILENAME"

  TEMP_FILE=$(mktemp)
  sed \
    -e 's/REFERENCES auth\.users(id)/REFERENCES auth.users(id)/g' \
    "$migration" > "$TEMP_FILE"

  CHECKSUM=$(sha256sum "$migration" | awk '{print $1}')

  if $PSQL_CMD -f "$TEMP_FILE" 2>&1; then
    $PSQL_CMD -c "INSERT INTO schema_migrations (filename, checksum) VALUES ('$FILENAME', '$CHECKSUM');" 2>/dev/null
    APPLIED=$((APPLIED + 1))
  else
    echo "  WARNING: Migration had errors: $FILENAME"
    FAILED=$((FAILED + 1))
  fi

  rm -f "$TEMP_FILE"
done

echo ""
echo "Step 4: Verifying schema..."

TABLE_COUNT=$($PSQL_CMD -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
RLS_COUNT=$($PSQL_CMD -t -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;" | tr -d ' ')
FUNCTION_COUNT=$($PSQL_CMD -t -c "SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public';" | tr -d ' ')

echo ""
echo "=== Migration Summary ==="
echo "  Migrations applied:          $APPLIED"
echo "  Migrations already applied:  $ALREADY_APPLIED"
echo "  Migrations skipped:          $SKIPPED"
echo "  Migrations failed:           $FAILED"
echo "  Tables created:              $TABLE_COUNT"
echo "  Tables with RLS:             $RLS_COUNT"
echo "  Functions created:           $FUNCTION_COUNT"
echo ""

AUTH_TEST=$($PSQL_CMD -t -c "
  BEGIN;
  SET LOCAL app.current_user_id = '00000000-0000-0000-0000-000000000001';
  SELECT auth.uid()::text;
  COMMIT;
" | tr -d ' ')

if [ "$AUTH_TEST" = "00000000-0000-0000-0000-000000000001" ]; then
  echo "  auth.uid() compatibility: PASS"
else
  echo "  auth.uid() compatibility: FAIL (got: $AUTH_TEST)"
fi

if [ "$FAILED" -gt 0 ]; then
  echo ""
  echo "  WARNING: $FAILED migration(s) had errors. Review the output above."
  echo "  The script is safe to re-run -- already-applied migrations will be skipped."
fi

echo ""
echo "=== Migration Complete ==="
