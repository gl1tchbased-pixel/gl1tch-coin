#!/usr/bin/env bash
# One-time setup of the website on the Oracle VM (run as root from a checkout of this folder).
# Secrets go in /etc/gl1tch-site/secrets.env by hand; this script never writes them.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)

id gl1tch-site >/dev/null 2>&1 || useradd --system --home /opt/gl1tch-site --shell /usr/sbin/nologin gl1tch-site
install -d -o gl1tch-site -g gl1tch-site /opt/gl1tch-site /opt/gl1tch-site/releases
install -d -m 750 -g gl1tch-site /etc/gl1tch-site
[ -f /etc/gl1tch-site/settings.env ] || install -m 640 -g gl1tch-site "$HERE/settings.env.example" /etc/gl1tch-site/settings.env
[ -f /etc/gl1tch-site/secrets.env ] || install -m 640 -g gl1tch-site /dev/null /etc/gl1tch-site/secrets.env

install -m 755 "$HERE/update.sh" /usr/local/bin/gl1tch-site-update
install -m 644 "$HERE/gl1tch-site.service" "$HERE/gl1tch-site-update.service" "$HERE/gl1tch-site-update.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable gl1tch-site.service gl1tch-site-update.timer
systemctl start gl1tch-site-update.timer
/usr/local/bin/gl1tch-site-update
