#!/usr/bin/env bash
set -euo pipefail

if [[ "${DATABASE_URL:-}" == file:* ]]; then
  db_path="${DATABASE_URL#file:}"
  db_dir="$(dirname "$db_path")"
  mkdir -p "$db_dir"

  if [[ ! -f "$db_path" && -f "db/custom.db" ]]; then
    cp "db/custom.db" "$db_path"
  fi
fi

export NODE_ENV=production
export HOSTNAME=0.0.0.0

exec node .next/standalone/server.js
