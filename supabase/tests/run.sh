#!/usr/bin/env bash
# Runs the schema + tests against a throwaway local Postgres database.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
DB=streakmates_test
export PGOPTIONS="-c client_min_messages=warning"
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
# roles are cluster-wide; ignore "already exists" on repeated runs
psql -q -d $DB -f supabase_stub.sql 2>&1 | grep -v "already exists" || true
psql -q -v ON_ERROR_STOP=1 -d $DB -f ../schema.sql
psql -q -v ON_ERROR_STOP=1 -d $DB -f ../schema.sql   # must be re-runnable
psql -q -v ON_ERROR_STOP=1 -d $DB -f test_schema.sql
echo "All database tests passed"
