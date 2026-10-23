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
# Files deleted or renamed since the deployed commit are removed too (tar only adds): a renamed route folder left
# behind once made two pages with the same address and broke the build. Only files git tracked are ever removed.
old=$(ssh "${ssh_opts[@]}" "$host" "cat /opt/vasanam/DEPLOYED_COMMIT 2>/dev/null" || true)
gone=""
if [ -n "$old" ] && git cat-file -e "$old^{commit}" 2>/dev/null; then gone=$(git diff --name-only --diff-filter=D --no-renames "$old" HEAD); fi
git archive --format=tar HEAD | ssh "${ssh_opts[@]}" "$host" "cd /opt/vasanam && tar -xf - && echo $commit > DEPLOYED_COMMIT"
if [ -n "$gone" ]; then
  printf '%s\n' "$gone" | ssh "${ssh_opts[@]}" "$host" 'cd /opt/vasanam && while IFS= read -r f; do rm -f -- "$f"; rmdir -p -- "$(dirname -- "$f")" 2>/dev/null || true; done'
  echo "Removed $(printf '%s\n' "$gone" | wc -l | tr -d ' ') deleted file(s)."
fi
# ONNXRUNTIME_NODE_INSTALL=skip: the model runtime would otherwise download its GPU (CUDA) files on Linux, which
# the server has no use for and which ran npm out of memory.
ssh "${ssh_opts[@]}" "$host" "cd /opt/vasanam && ONNXRUNTIME_NODE_INSTALL=skip npm ci --no-audit --no-fund > deploy.log 2>&1 && (set -a && . ./.env.local && set +a && npx drizzle-kit migrate) >> deploy.log 2>&1 && npm run build >> deploy.log 2>&1 && pm2 restart vasanam-web vasanam-worker > /dev/null" \
  || { echo "Deploy failed; see /opt/vasanam/deploy.log on the server."; exit 1; }
echo "Deployed $commit to $host."
