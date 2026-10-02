#!/usr/bin/env bash
# Sets up the dev Sprite that coding agents work in (D-059).
#
# Runs inside the Sprite, and is safe to run again: each step checks before it
# acts. Sign `gh` in first (see "Working on the Sprite" in CLAUDE.md). The
# Sprite only ever holds generated data: local Supabase and the seed script,
# never staging or production credentials.
#
#   bash scripts/sprite/bootstrap.sh
#
# HOUSEMATE_DIR overrides where the repo is cloned (default ~/housemate).

set -euo pipefail

repo="johnrehealy/housemate_prototype"
dir="${HOUSEMATE_DIR:-$HOME/housemate}"
sudo=""
[ "$(id -u)" -eq 0 ] || sudo="sudo"

step() { printf '\n==> %s\n' "$*"; }
fail() { printf 'bootstrap: %s\n' "$*" >&2; exit 1; }

step "Node"
node_major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
[ "$node_major" -ge 24 ] || fail "Node 24 or newer is required (found ${node_major})."

step "System packages"
$sudo apt-get update -qq
$sudo apt-get install -y -qq gh bubblewrap socat docker.io >/dev/null

step "pnpm, through corepack"
mkdir -p "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"
corepack enable --install-directory "$HOME/.local/bin"

step "Docker"
# No systemd in a Sprite, so dockerd runs as a Sprite service, which comes
# back on its own after the Sprite sleeps.
if ! sprite-env services get dockerd >/dev/null 2>&1; then
  if [ -n "$sudo" ]; then
    sprite-env services create dockerd --cmd "$sudo" --args dockerd
  else
    sprite-env services create dockerd --cmd dockerd
  fi
fi
id -nG | grep -qw docker || $sudo usermod -aG docker "$(id -un)"
for _ in $(seq 30); do $sudo docker info >/dev/null 2>&1 && break; sleep 1; done
$sudo docker info >/dev/null 2>&1 || fail "dockerd didn't start; see /.sprite/logs/services/dockerd.log."

step "GitHub"
gh auth status >/dev/null 2>&1 || fail "sign gh in first: gh auth login"
gh auth setup-git
if [ -z "$(git config --global user.name || true)" ]; then
  # GitHub's no-reply address, so no personal email lands on the Sprite.
  login=$(gh api user --jq .login)
  git config --global user.name "$login"
  git config --global user.email "$(gh api user --jq .id)+${login}@users.noreply.github.com"
fi

step "Repo"
if [ -d "$dir/.git" ]; then
  git -C "$dir" fetch --prune
else
  gh repo clone "$repo" "$dir"
fi
cd "$dir"

step "Dependencies"
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium

step "Local Supabase"
# Docker group membership only applies to new logins, so go through sg here.
sg docker -c "pnpm db:start"

step ".env.local"
if [ ! -f .env.local ]; then
  status=$(sg docker -c "pnpm exec supabase status -o env")
  publishable=$(printf '%s\n' "$status" | sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p')
  secret=$(printf '%s\n' "$status" | sed -n 's/^SECRET_KEY="\(.*\)"$/\1/p')
  [ -n "$publishable" ] && [ -n "$secret" ] || fail "supabase status didn't report the local keys."
  sed -e "s|^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishable}|" \
    -e "s|^SUPABASE_SECRET_KEY=.*|SUPABASE_SECRET_KEY=${secret}|" \
    .env.example >.env.local
  chmod 600 .env.local
fi
# Next reads env files from the app directory.
[ -e apps/web/.env.local ] || ln -s ../../.env.local apps/web/.env.local

step "Database"
sg docker -c "pnpm db:reset"
pnpm db:seed

step "Done"
echo "Repo: $dir. Next: sign Claude Code in with 'claude', then take the 'base' checkpoint."
