#!/usr/bin/env bash
set -euo pipefail

pnpm install --frozen-lockfile
pnpm prisma generate

export DATABASE_URL="${BUILD_DATABASE_URL:-file:../db/custom.db}"
pnpm build
