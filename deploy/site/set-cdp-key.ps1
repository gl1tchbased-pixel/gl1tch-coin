# Puts a Coinbase CDP API key on the Oracle VM so x402 payments settle through Coinbase's facilitator again
# (that is what keeps the endpoints listed in the Coinbase x402 Bazaar; without it PayAI settles everything).
# Usage, from the repo root, with the key file the CDP portal downloaded:
#   pwsh deploy/site/set-cdp-key.ps1 C:\Users\MSI\Downloads\cdp_api_key.json
# The key goes over ssh straight into /etc/gl1tch-site/secrets.env (replacing old CDP lines), the site restarts,
# and the local key file is deleted. Nothing is printed.
param([Parameter(Mandatory = $true)][string]$KeyFile)
$ErrorActionPreference = "Stop"
$sshKey = Join-Path $env:USERPROFILE ".ssh\gl1tch_oracle"
$hostAddr = "ubuntu@92.5.63.99"

$k = Get-Content $KeyFile -Raw | ConvertFrom-Json
$id = if ($k.id) { $k.id } elseif ($k.name) { $k.name } else { throw "No 'id' or 'name' in $KeyFile" }
$secret = $k.privateKey
if (-not $secret) { throw "No 'privateKey' in $KeyFile" }
# EnvironmentFile values are one line: keep PEM newlines as \n (the CDP SDK reads them back).
$secret = ($secret -replace "`r", "") -replace "`n", "\n"

$payload = "CDP_API_KEY_ID=`"$id`"`nCDP_API_KEY_SECRET=`"$secret`"`n"
$remote = 'sudo sh -c ''f=/etc/gl1tch-site/secrets.env; touch "$f"; sed -i "/^CDP_API_KEY_ID=/d;/^CDP_API_KEY_SECRET=/d" "$f"; cat >> "$f"; systemctl restart gl1tch-site'''
$payload | ssh -i $sshKey -o BatchMode=yes $hostAddr $remote
if ($LASTEXITCODE -ne 0) { throw "ssh failed ($LASTEXITCODE); the key was NOT stored and $KeyFile was kept" }
$payload = $null; $secret = $null

Remove-Item $KeyFile
Write-Host "Stored on the server and the site restarted. Deleted $KeyFile."

# Check: once CDP is active, the Solana fee payer in the 402 answer (base64 Payment-Required header) is no
# longer one of PayAI's (read live from PayAI's /supported).
Start-Sleep -Seconds 20
try {
  $r = Invoke-WebRequest "https://gl1tchbased.xyz/api/x402/scan?mint=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" -SkipHttpErrorCheck
  $req = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String([string]$r.Headers["Payment-Required"])) | ConvertFrom-Json
  $fee = ($req.accepts | Where-Object { $_.network -like "solana:*" } | Select-Object -First 1).extra.feePayer
  $payai = (Invoke-RestMethod "https://facilitator.payai.network/supported").kinds.extra.feePayer
  if ($fee -and $payai -notcontains $fee) { Write-Host "OK: Solana fee payer $fee is not PayAI's, so Coinbase (CDP) is active." }
  else { Write-Host "Fee payer $fee is still PayAI's. Wait a minute and run the check again, or tell Claude." }
} catch { Write-Host "Could not check the site: $($_.Exception.Message)" }
