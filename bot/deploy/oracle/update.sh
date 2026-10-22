#!/usr/bin/env bash
# Pull-based deploy, run every 5 min by gl1tch-bot-update.timer: when main changes anything under
# bot/, check it out, reinstall deps if the lockfile changed, restart, and roll back if /health
# doesn't answer within a minute. A commit that failed is remembered and skipped until main moves on.
set -euo pipefail

APP=/opt/gl1tch/app
STATE=/var/lib/gl1tch-bot-deploy
as_app() { runuser -u gl1tch -- env HOME=/opt/gl1tch PATH=/usr/local/bin:/usr/bin:/bin "$@"; }
deps() { (cd "$APP/bot" && as_app npm ci --omit=dev --no-audit --no-fund --loglevel=error); }
healthy() {
  for _ in $(seq 1 12); do
    sleep 5
    curl -fsS --max-time 3 http://127.0.0.1:8787/health >/dev/null 2>&1 && return 0
  done
  return 1
}

cd "$APP"
as_app git fetch --quiet origin main
old="$(as_app git rev-parse HEAD)"
new="$(as_app git rev-parse origin/main)"
[ "$old" = "$new" ] && exit 0
[ "$(cat "$STATE/bad" 2>/dev/null)" = "$new" ] && exit 0

if as_app git diff --quiet "$old" "$new" -- bot ':!bot/deploy'; then
  as_app git reset --quiet --hard "$new"   # nothing the running bot uses changed
  exit 0
fi

lock=no
as_app git diff --quiet "$old" "$new" -- bot/package-lock.json || lock=yes
as_app git reset --quiet --hard "$new"
[ "$lock" = yes ] && deps
systemctl restart gl1tch-bot
if healthy; then
  echo "deployed ${old:0:7} -> ${new:0:7}"
  rm -f "$STATE/bad"
  exit 0
fi

echo "health check failed on ${new:0:7}; rolling back to ${old:0:7}" >&2
echo "$new" > "$STATE/bad"
as_app git reset --quiet --hard "$old"
[ "$lock" = yes ] && deps
systemctl restart gl1tch-bot
exit 1
