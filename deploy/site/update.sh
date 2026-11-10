#!/usr/bin/env bash
# Pulls the newest website build from the "site-build" release, verifies it, swaps it in and
# rolls back if the health check fails. Run by gl1tch-site-update.timer every 5 minutes.
set -euo pipefail

# One run at a time: the timer and a manual run must not extract into the same folder.
exec 9>/run/gl1tch-site-update.lock
flock -n 9 || { echo "another update is running" >&2; exit 0; }

BASE="https://github.com/gl1tchbased-pixel/gl1tch-coin/releases/download/site-build"
ROOT=/opt/gl1tch-site
HEALTH="http://127.0.0.1:3000/api/x402/health"
KEEP=3

want=$(curl -fsSL --max-time 30 "$BASE/site.rev" | tr -d '[:space:]') || exit 0
[[ "$want" =~ ^[0-9a-f]{40}$ ]] || { echo "bad revision string" >&2; exit 0; }
have=$(cat "$ROOT/current/REVISION" 2>/dev/null | tr -d '[:space:]' || true)
[ "$want" = "$have" ] && exit 0
# A build that failed its health check is skipped until a newer one is published.
[ "$want" = "$(cat "$ROOT/bad-rev" 2>/dev/null || true)" ] && exit 0

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL --max-time 600 -o "$tmp/site.tar.gz" "$BASE/site.tar.gz"
sum=$(curl -fsSL --max-time 30 "$BASE/site.sha256" | tr -d '[:space:]')
echo "$sum  $tmp/site.tar.gz" | sha256sum -c --quiet - || { echo "checksum mismatch (upload in progress?)" >&2; exit 0; }
[ "$(tar -xzOf "$tmp/site.tar.gz" ./REVISION | tr -d '[:space:]')" = "$want" ] || { echo "archive is not $want yet" >&2; exit 0; }

dir="$ROOT/releases/$want"
rm -rf "$dir"
mkdir -p "$dir"
tar -xzf "$tmp/site.tar.gz" -C "$dir"
chown -R gl1tch-site:gl1tch-site "$dir"

prev=$(readlink -f "$ROOT/current" 2>/dev/null || true)
ln -sfn "$dir" "$ROOT/current.new" && mv -T "$ROOT/current.new" "$ROOT/current"
systemctl restart gl1tch-site

for _ in $(seq 1 45); do
  sleep 2
  if curl -fsS -o /dev/null --max-time 5 "$HEALTH"; then
    echo "live: $want"
    # Keep the newest $KEEP releases plus whatever is live.
    live=$(readlink -f "$ROOT/current")
    ls -1dt "$ROOT"/releases/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
      [ "$(readlink -f "$old")" = "$live" ] || rm -rf "$old"
    done
    exit 0
  fi
done

echo "health check failed for $want, rolling back" >&2
echo "$want" > "$ROOT/bad-rev"
if [ -n "$prev" ] && [ -d "$prev" ]; then
  ln -sfn "$prev" "$ROOT/current.new" && mv -T "$ROOT/current.new" "$ROOT/current"
  systemctl restart gl1tch-site
fi
exit 1
