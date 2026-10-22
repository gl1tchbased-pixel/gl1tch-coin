#!/usr/bin/env bash
# Daily snapshot of the bot's data folder; keeps the last 14.
set -euo pipefail
OUT=/var/backups/gl1tch-bot
tar -czf "$OUT/$(date -u +%Y-%m-%d).tar.gz" -C /var/lib gl1tch-bot
ls -1t "$OUT"/*.tar.gz | tail -n +15 | xargs -r rm -f
