#!/usr/bin/env bash
# One-time (and safe to re-run) provisioning of the GL1TCH bot on an Oracle Cloud Always Free VM
# running Ubuntu 24.04 (Ampere A1 or AMD E2.1.Micro). Run as root from a checkout of this folder:
#   sudo bash setup.sh
# Secrets are NOT handled here: put them in /etc/gl1tch-bot/secrets.env (see README.md), then
#   sudo systemctl restart gl1tch-bot
set -euo pipefail

REPO=https://github.com/gl1tchbased-pixel/gl1tch-coin.git
APP=/opt/gl1tch/app
DATA=/var/lib/gl1tch-bot
CONF=/etc/gl1tch-bot
HERE="$(cd "$(dirname "$0")" && pwd)"
NODE_MAJOR=22

[ "$(id -u)" = 0 ] || { echo "run as root (sudo bash setup.sh)"; exit 1; }
as_app() { runuser -u gl1tch -- env HOME=/opt/gl1tch PATH=/usr/local/bin:/usr/bin:/bin "$@"; }

echo "== packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q git curl ca-certificates xz-utils caddy iptables-persistent unattended-upgrades
# Security updates install themselves; the bot is restarted by systemd if a library it uses changes.
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== node ${NODE_MAJOR} (official tarball, checksum-verified)"
case "$(uname -m)" in
  aarch64) ARCH=arm64 ;;
  x86_64) ARCH=x64 ;;
  *) echo "unsupported arch $(uname -m)"; exit 1 ;;
esac
if ! /usr/local/bin/node -v 2>/dev/null | grep -q "^v${NODE_MAJOR}\."; then
  base="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x"
  tmp="$(mktemp -d)"
  curl -fsSL "$base/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  file="$(grep -o "node-v[0-9.]*-linux-${ARCH}.tar.xz" "$tmp/SHASUMS256.txt" | head -1)"
  curl -fsSL "$base/$file" -o "$tmp/$file"
  (cd "$tmp" && grep " $file\$" SHASUMS256.txt | sha256sum -c -)
  tar -xJf "$tmp/$file" -C /usr/local --strip-components=1 --exclude CHANGELOG.md --exclude LICENSE --exclude README.md
  rm -rf "$tmp"
fi
/usr/local/bin/node -v

echo "== user, folders"
id gl1tch >/dev/null 2>&1 || useradd --system --home /opt/gl1tch --create-home --shell /usr/sbin/nologin gl1tch
install -d -o gl1tch -g gl1tch -m 750 "$DATA"
install -d -o root -g gl1tch -m 750 "$CONF"
install -d -o root -g root -m 700 /var/backups/gl1tch-bot /var/lib/gl1tch-bot-deploy
[ -f "$CONF/settings.env" ] || install -o root -g gl1tch -m 640 "$HERE/settings.env.example" "$CONF/settings.env"
[ -f "$CONF/secrets.env" ] || install -o root -g gl1tch -m 640 /dev/null "$CONF/secrets.env"

echo "== code (public repo, bot/ only)"
if [ ! -d "$APP/.git" ]; then
  as_app git clone --quiet --filter=blob:none --no-checkout "$REPO" "$APP"
  as_app git -C "$APP" sparse-checkout set bot
  as_app git -C "$APP" checkout --quiet main
fi
(cd "$APP/bot" && as_app npm ci --omit=dev --no-audit --no-fund)

echo "== systemd units"
install -m 644 "$HERE/gl1tch-bot.service" "$HERE/gl1tch-bot-update.service" "$HERE/gl1tch-bot-update.timer" \
  "$HERE/gl1tch-bot-backup.service" "$HERE/gl1tch-bot-backup.timer" /etc/systemd/system/
install -m 755 "$HERE/update.sh" /usr/local/sbin/gl1tch-bot-update
install -m 755 "$HERE/backup.sh" /usr/local/sbin/gl1tch-bot-backup
systemctl daemon-reload
systemctl enable --now gl1tch-bot-update.timer gl1tch-bot-backup.timer
systemctl enable gl1tch-bot
if [ -s "$CONF/secrets.env" ]; then systemctl restart gl1tch-bot; else echo "!! $CONF/secrets.env is empty: bot not started yet"; fi

echo "== https (Caddy) + host firewall"
install -m 644 "$HERE/Caddyfile" /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy
# Oracle's Ubuntu images end the INPUT chain with a REJECT; open 80/443 just before it.
for port in 80 443; do
  if ! iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    at="$(iptables -L INPUT --line-numbers | awk '/REJECT/ {print $1; exit}')"
    if [ -n "$at" ]; then iptables -I INPUT "$at" -p tcp --dport "$port" -m state --state NEW -j ACCEPT
    else iptables -A INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT; fi
  fi
done
netfilter-persistent save >/dev/null

echo "== done"
systemctl --no-pager --lines=0 status gl1tch-bot caddy || true
