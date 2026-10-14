#!/bin/bash
# Deploys the committed code (HEAD) to the server and restarts it. Usage:
#   scripts/deploy.sh ubuntu@<host> [path-to-ssh-key]
# Ships exactly what git tracks (git archive), so storage/, .env.local and public/downloads/ on the server are never
# touched. The deployed commit is written to /opt/vasanam/DEPLOYED_COMMIT.
set -euo pipefail
host=${1:?usage: scripts/deploy.sh ubuntu@<host> [ssh-key]}
ssh_opts=(-o BatchMode=yes); [ -n "${2:-}" ] && ssh_opts+=(-i "$2")
cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain)" ] || { echo "Commit or stash your changes first: only committed code is deployed."; exit 1; }
commit=$(git rev-parse --short HEAD)
git archive --format=tar HEAD | ssh "${ssh_opts[@]}" "$host" "cd /opt/vasanam && tar -xf - && echo $commit > DEPLOYED_COMMIT"
ssh "${ssh_opts[@]}" "$host" "cd /opt/vasanam && npm ci --no-audit --no-fund > deploy.log 2>&1 && npx drizzle-kit migrate >> deploy.log 2>&1 && npm run build >> deploy.log 2>&1 && pm2 restart vasanam-web vasanam-worker > /dev/null" \
  || { echo "Deploy failed; see /opt/vasanam/deploy.log on the server."; exit 1; }
echo "Deployed $commit to $host."
