$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runtimeSource = Join-Path $root "src-tauri\WebView2Runtime"
$runtimeExe = Join-Path $runtimeSource "msedgewebview2.exe"
$releaseExe = Join-Path $root "src-tauri\target\release\command-pocket.exe"
$outRoot = Join-Path $root "dist-portable"
$appDir = Join-Path $outRoot "CommandPocket"
$runtimeDest = Join-Path $appDir "WebView2Runtime"
$dataDir = Join-Path $appDir "app-data"
$zipPath = Join-Path $outRoot "CommandPocket-portable-win-x64.zip"

if (-not (Test-Path -LiteralPath $runtimeExe)) {
    throw "WebView2Runtime not found. Extract the fixed runtime to src-tauri\WebView2Runtime so msedgewebview2.exe is directly inside."
}

Push-Location -LiteralPath $root
try {
    npm run tauri build -- --no-bundle
    if ($LASTEXITCODE -ne 0) {
        throw "tauri build failed"
    }
}
finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath $releaseExe)) {
    throw "Release exe not found: $releaseExe"
}

if (Test-Path -LiteralPath $outRoot) {
    Remove-Item -LiteralPath $outRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $appDir -Force | Out-Null
New-Item -ItemType Directory -Path $runtimeDest -Force | Out-Null
New-Item -ItemType Directory -Path $dataDir -Force | Out-Null

Copy-Item -LiteralPath $releaseExe -Destination $appDir
Copy-Item -Path (Join-Path $runtimeSource "*") -Destination $runtimeDest -Recurse -Force

Compress-Archive -Path (Join-Path $appDir "*") -DestinationPath $zipPath -Force
