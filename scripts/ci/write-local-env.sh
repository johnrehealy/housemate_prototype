#!/usr/bin/env bash
# Writes .env.local for CI: .env.example's local defaults, plus the keys of the
# local Supabase stack this run just started. The keys are the stack's own
# generated ones, not secrets, and the file never leaves the runner.
#
# Next.js reads .env.local from apps/web, so it gets the same file there, as
# the symlink every checkout has locally.
set -euo pipefail
cd "$(dirname "$0")/../.."

eval "$(pnpm exec supabase status -o env | grep -E '^(PUBLISHABLE_KEY|SECRET_KEY)=')"
: "${PUBLISHABLE_KEY:?supabase status gave no PUBLISHABLE_KEY}"
: "${SECRET_KEY:?supabase status gave no SECRET_KEY}"

sed \
  -e "s|^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE_KEY}|" \
  -e "s|^SUPABASE_SECRET_KEY=.*|SUPABASE_SECRET_KEY=${SECRET_KEY}|" \
  .env.example >.env.local
ln -sf ../../.env.local apps/web/.env.local
echo "Wrote .env.local"
