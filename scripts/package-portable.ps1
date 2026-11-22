$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runtimeSource = Join-Path $root "src-tauri\WebView2Runtime"
$runtimeExe = Join-Path $runtimeSource "msedgewebview2.exe"
$releaseExe = Join-Path $root "src-tauri\target\release\copy-pocket.exe"
$outRoot = Join-Path $root "dist-portable"
$appDir = Join-Path $outRoot "CopyPocket"
$runtimeDest = Join-Path $appDir "WebView2Runtime"
$dataDir = Join-Path $appDir "app-data"
$zipPath = Join-Path $outRoot "CopyPocket-portable-win-x64.zip"

if (Test-Path -LiteralPath $runtimeSource) {
    $foundExe = Get-ChildItem -LiteralPath $runtimeSource -Recurse -Filter "msedgewebview2.exe" -File | Select-Object -First 1
    if ($foundExe -and $foundExe.DirectoryName -ne $runtimeSource) {
        Move-Item -Path (Join-Path $foundExe.DirectoryName "*") -Destination $runtimeSource -Force
        Get-ChildItem -LiteralPath $runtimeSource -Recurse -Directory |
            Where-Object { -not (Get-ChildItem -LiteralPath $_.FullName -Force) } |
            Remove-Item -Force
    }
}

if (-not (Test-Path -LiteralPath $runtimeExe)) {
    throw "WebView2Runtime not found. Extract the fixed runtime .cab into src-tauri\WebView2Runtime first."
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
