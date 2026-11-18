# One-time setup: creates GL1TCH's permanent Android release signing key.
# - Keeps the key and its password in Documents\GL1TCH-android-signing (copy that folder to a USB stick and a
#   password manager: if the key is lost, the app can never be updated in the Solana dApp Store).
# - Stores the same key as GitHub Actions secrets, so the mobile-apk workflow signs release APKs with it.
# The password is generated here and never printed. Run from the repo root:  pwsh mobile/scripts/create-signing-key.ps1
# Only the repo owner can set Actions secrets, so the GitHub CLI must be logged in as gl1tchbased-pixel.
# Safe to run again: if the key already exists it is reused (never replaced) and only the secrets are set.
$ErrorActionPreference = "Stop"
$repo = "gl1tchbased-pixel/gl1tch-coin"
$alias = "gl1tch"
$dir = Join-Path $env:USERPROFILE "Documents\GL1TCH-android-signing"
$ks = Join-Path $dir "gl1tch-release.jks"
$pwFile = Join-Path $dir "PASSWORD.txt"
$keytool = "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"

if (-not (Test-Path $keytool)) { throw "keytool not found at $keytool" }
$admin = gh api "repos/$repo" --jq .permissions.admin 2>$null
if ($admin -ne "true") {
  $who = gh api user --jq .login 2>$null
  throw "GitHub CLI is logged in as '$who', which can't set secrets on $repo. Run  gh auth login --web  and sign in as gl1tchbased-pixel, then run this script again."
}

if (Test-Path $ks) {
  if (-not (Test-Path $pwFile)) { throw "Key exists at $ks but PASSWORD.txt is missing. Not touching it." }
  Write-Host "Key already exists at $ks. Reusing it, not creating a new one."
  $pass = (Get-Content $pwFile -Raw).Trim()
} else {
  New-Item -ItemType Directory -Force $dir | Out-Null
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  $pass = ([Convert]::ToBase64String($bytes)) -replace '[+/=]', ''

  & $keytool -genkeypair -keystore $ks -storetype PKCS12 -alias $alias -keyalg RSA -keysize 4096 -validity 10000 `
    -storepass $pass -keypass $pass -dname "CN=GL1TCH, O=GL1TCH, C=TR" 2>&1 | Out-Null
  if (-not (Test-Path $ks)) { throw "keytool did not create the key" }
  Set-Content -Path $pwFile -Value $pass -NoNewline
}

Set-Content -Path (Join-Path $dir "README.txt") -Value @"
GL1TCH Android release signing key (created $(Get-Date -Format yyyy-MM-dd)).
Files: gl1tch-release.jks (the key), PASSWORD.txt (store and key password), alias: $alias.
Keep a copy on a USB stick and in a password manager. Never commit these files or share them.
If this key is lost, the app can't be updated in the Solana dApp Store; a new key means a new app listing.
GitHub Actions secrets ANDROID_KEYSTORE_BASE64 and ANDROID_KEYSTORE_PASSWORD hold the same key for CI signing.
"@

$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($ks))
gh secret set ANDROID_KEYSTORE_BASE64 -R $repo --body $b64 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Setting ANDROID_KEYSTORE_BASE64 failed. The key is saved; run this script again." }
gh secret set ANDROID_KEYSTORE_PASSWORD -R $repo --body $pass | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Setting ANDROID_KEYSTORE_PASSWORD failed. The key is saved; run this script again." }
$b64 = $null

# The certificate fingerprint is public (the dApp Store and anyone can check an APK against it).
$fp = (& $keytool -list -v -keystore $ks -storepass $pass 2>$null | Select-String "SHA256:").ToString().Trim()
$pass = $null
Set-Content -Path (Join-Path $dir "FINGERPRINT.txt") -Value $fp
Write-Host "Done. Key + password in $dir (back this folder up). GitHub secrets set."
Write-Host "Certificate $fp"
