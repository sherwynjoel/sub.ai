# Installs the panel straight from plugin/ into this PC's Premiere (developer mode, unsigned) and turns on the test channel.
# Usage: powershell -File plugin/dev/install.ps1 -Server https://13-201-93-154.sslip.io
param([string]$Server = "https://13-201-93-154.sslip.io")
$ErrorActionPreference = "Stop"
$src = Split-Path $PSScriptRoot -Parent
$dst = Join-Path $env:APPDATA "Adobe\CEP\extensions\com.vasanam.panel"
foreach ($v in 9..12) { New-Item -Force "HKCU:\Software\Adobe\CSXS.$v" | Out-Null; Set-ItemProperty "HKCU:\Software\Adobe\CSXS.$v" PlayerDebugMode 1 }
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
New-Item -ItemType Directory -Force (Join-Path $dst "CSXS") | Out-Null
Copy-Item (Join-Path $src "CSXS\manifest.xml") (Join-Path $dst "CSXS")
foreach ($f in "index.html", "style.css", "subs.js", "main.js", "host.jsx", "templates.json") { Copy-Item (Join-Path $src $f) $dst }
Copy-Item -Recurse (Join-Path $src "templates") (Join-Path $dst "templates")
$main = Join-Path $dst "main.js"
[IO.File]::WriteAllText($main, ([IO.File]::ReadAllText($main) -replace 'var DEFAULT_SERVER = "[^"]*"', "var DEFAULT_SERVER = `"$Server`""))
New-Item -ItemType Directory -Force (Join-Path $env:TEMP "vasanam-dev") | Out-Null
Write-Host "Installed to $dst; test channel at $env:TEMP\vasanam-dev"
