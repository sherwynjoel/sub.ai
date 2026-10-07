# Packages the panel into public/downloads/vasanam-panel.zxp (signed with a self-signed cert).
# Usage:  powershell -File plugin/build.ps1 -Server https://your-domain.com
param([string]$Server = "http://localhost:3000", [string]$CertPassword = "vasanam-cert")

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$tools = Join-Path $PSScriptRoot ".tools"
$sign = Join-Path $tools "ZXPSignCmd.exe"
$cert = Join-Path $tools "vasanam-cert.p12"
$stage = Join-Path $tools "stage"
$out = Join-Path $root "public\downloads\vasanam-panel.zxp"

New-Item -ItemType Directory -Force $tools, (Split-Path $out) | Out-Null
if (-not (Test-Path $sign)) {
  # Adobe's official signing tool
  Invoke-WebRequest "https://github.com/Adobe-CEP/CEP-Resources/raw/master/ZXPSignCMD/4.1.103/win64/ZXPSignCmd.exe" -OutFile $sign
}
if (-not (Test-Path $cert)) {
  & $sign -selfSignedCert IN TN Vasanam Vasanam $CertPassword $cert | Out-Host
}

# Stage only what the panel needs, with the server address baked in.
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory $stage, (Join-Path $stage "CSXS") | Out-Null
Copy-Item (Join-Path $PSScriptRoot "CSXS\manifest.xml") (Join-Path $stage "CSXS")
foreach ($f in "index.html", "style.css", "subs.js", "main.js", "host.jsx") { Copy-Item (Join-Path $PSScriptRoot $f) $stage }
Copy-Item (Join-Path $PSScriptRoot "fonts") $stage -Recurse
$main = Join-Path $stage "main.js"
[IO.File]::WriteAllText($main, ([IO.File]::ReadAllText($main) -replace 'var DEFAULT_SERVER = "[^"]*"', "var DEFAULT_SERVER = `"$Server`""))

if (Test-Path $out) { Remove-Item $out }
& $sign -sign $stage $out $cert $CertPassword -tsa http://timestamp.digicert.com | Out-Host
if (-not (Test-Path $out)) {
  # Timestamp server unreachable: sign without it (the package then stops installing when the cert expires).
  if (Test-Path (Join-Path $stage "META-INF")) { Remove-Item -Recurse -Force (Join-Path $stage "META-INF") }
  & $sign -sign $stage $out $cert $CertPassword | Out-Host
}
if (-not (Test-Path $out)) { throw "Signing failed" }
& $sign -verify $out | Out-Host
Write-Host "Built $out"
