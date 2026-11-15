# One-time setup: creates GL1TCH's permanent Android release signing key.
# - Keeps the key and its password in Documents\GL1TCH-android-signing (copy that folder to a USB stick and a
#   password manager: if the key is lost, the app can never be updated in the Solana dApp Store).
# - Stores the same key as GitHub Actions secrets, so the mobile-apk workflow signs release APKs with it.
# The password is generated here and never printed. Run from the repo root:  pwsh mobile/scripts/create-signing-key.ps1
$ErrorActionPreference = "Stop"
$repo = "gl1tchbased-pixel/gl1tch-coin"
$alias = "gl1tch"
$dir = Join-Path $env:USERPROFILE "Documents\GL1TCH-android-signing"
$ks = Join-Path $dir "gl1tch-release.jks"
$keytool = "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"

if (Test-Path $ks) { throw "A key already exists at $ks. Not overwriting it." }
if (-not (Test-Path $keytool)) { throw "keytool not found at $keytool" }
New-Item -ItemType Directory -Force $dir | Out-Null

$bytes = New-Object byte[] 24
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$pass = ([Convert]::ToBase64String($bytes)) -replace '[+/=]', ''

& $keytool -genkeypair -keystore $ks -storetype PKCS12 -alias $alias -keyalg RSA -keysize 4096 -validity 10000 `
  -storepass $pass -keypass $pass -dname "CN=GL1TCH, O=GL1TCH, C=TR" 2>&1 | Out-Null
if (-not (Test-Path $ks)) { throw "keytool did not create the key" }

Set-Content -Path (Join-Path $dir "PASSWORD.txt") -Value $pass -NoNewline
Set-Content -Path (Join-Path $dir "README.txt") -Value @"
GL1TCH Android release signing key (created $(Get-Date -Format yyyy-MM-dd)).
Files: gl1tch-release.jks (the key), PASSWORD.txt (store and key password), alias: $alias.
Keep a copy on a USB stick and in a password manager. Never commit these files or share them.
If this key is lost, the app can't be updated in the Solana dApp Store; a new key means a new app listing.
GitHub Actions secrets ANDROID_KEYSTORE_BASE64 and ANDROID_KEYSTORE_PASSWORD hold the same key for CI signing.
"@

$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($ks))
gh secret set ANDROID_KEYSTORE_BASE64 -R $repo --body $b64 | Out-Null
gh secret set ANDROID_KEYSTORE_PASSWORD -R $repo --body $pass | Out-Null
$b64 = $null; $pass = $null

# The certificate fingerprint is public (the dApp Store and anyone can check an APK against it).
$fp = (& $keytool -list -v -keystore $ks -storepass (Get-Content (Join-Path $dir "PASSWORD.txt")) 2>$null |
  Select-String "SHA256:").ToString().Trim()
Set-Content -Path (Join-Path $dir "FINGERPRINT.txt") -Value $fp
Write-Host "Done. Key + password in $dir (back this folder up). GitHub secrets set."
Write-Host "Certificate $fp"
