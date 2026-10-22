# Bot hosting: Oracle Cloud Always Free

The Telegram bot and its public API (`https://bot.gl1tchbased.xyz`) run on one Always Free VM
(Ubuntu 24.04) instead of Railway. That means no monthly bill, and no secrets stored on a platform we don't control.

| Piece | Where |
|---|---|
| Code | `/opt/gl1tch/app` (sparse checkout of `bot/` from `main`) |
| Data (Signal Graph, Watchtower, stats, …) | `/var/lib/gl1tch-bot` |
| Non-secret settings | `/etc/gl1tch-bot/settings.env` (template: `settings.env.example`) |
| Secrets | `/etc/gl1tch-bot/secrets.env` (`BOT_TOKEN`, `SOLANA_RPC`, `STATS_TOKEN`, `X_BRIDGE_TOKEN`, …), mode 640 |
| HTTPS | Caddy, Let's Encrypt certificate, proxies to `127.0.0.1:8787` |
| Snapshots | `/var/backups/gl1tch-bot`, daily at 03:30 UTC, 14 kept |

## Deploys

There's no CI push. `gl1tch-bot-update.timer` runs `update.sh` every 5 minutes:
- It pulls `main`. When something under `bot/` changed, it reinstalls deps (only if the lockfile changed) and restarts.
- If `/health` doesn't answer within a minute, it rolls back. The failed commit is skipped until `main` moves past it.

## First setup

1. In the instance's VCN, open TCP 80 and 443 to `0.0.0.0/0` (security list, ingress).
2. Point DNS `bot.gl1tchbased.xyz` (A) at the VM's public IP.
3. On the VM:
   ```sh
   git clone --filter=blob:none --sparse https://github.com/gl1tchbased-pixel/gl1tch-coin.git /tmp/g
   git -C /tmp/g sparse-checkout set bot/deploy/oracle
   sudo bash /tmp/g/bot/deploy/oracle/setup.sh
   ```
4. Fill in `/etc/gl1tch-bot/settings.env` and `/etc/gl1tch-bot/secrets.env`, then run
   `sudo systemctl restart gl1tch-bot`.

## Everyday

```sh
systemctl status gl1tch-bot                      # running?
journalctl -u gl1tch-bot -n 100 --no-pager       # bot logs
journalctl -u gl1tch-bot-update -n 50 --no-pager # deploys and rollbacks
sudo systemctl restart gl1tch-bot                # after editing settings/secrets
```

Only one bot may poll Telegram at a time. Never run another copy (Railway, local `npm start`) with the same `BOT_TOKEN`.
