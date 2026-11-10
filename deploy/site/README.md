# Website on the Oracle VM

Since 2026-11-10 the website runs on the same Oracle Always Free VM as the bot. Vercel paused the
Hobby team for going over the Fluid Active CPU fair-use limit, and the Hobby plan doesn't allow
commercial use anyway.

| Piece | What it does |
|---|---|
| `.github/workflows/site-build.yml` | Builds `main` with `NEXT_OUTPUT=standalone` and publishes `site.tar.gz`, `site.sha256` and `site.rev` to the `site-build` release |
| `update.sh` (`gl1tch-site-update.timer`, every 5 min) | Downloads a new build, checks the checksum and revision, swaps `/opt/gl1tch-site/current`, rolls back if `/api/x402/health` fails |
| `gl1tch-site.service` | `node server.js` on 127.0.0.1:3000 as user `gl1tch-site`, heap 384 MB, hard cap 700 MB |
| `bot/deploy/oracle/Caddyfile` | HTTPS for `gl1tchbased.xyz`, `www` redirects to the apex |

Config: `/etc/gl1tch-site/settings.env` (non-secret) and `/etc/gl1tch-site/secrets.env` (secrets,
mode 640). Restart with `sudo systemctl restart gl1tch-site` after editing either.

Deploy = merge to `main`. The server picks the build up within about 5 minutes of the workflow
finishing. A build that fails its health check is written to `/opt/gl1tch-site/bad-rev` and
skipped until a newer one is published.

Logs: `journalctl -u gl1tch-site -f` and `journalctl -u gl1tch-site-update`.
