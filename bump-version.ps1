# manifest.json の patch を +1 し、manifest.example.json を同期する（AutoScroller と同じ）。
# 手動実行: .\bump-version.ps1
# 通常は pre-commit フックが同じ処理を行う。

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }
Push-Location $root
try {
    node scripts/version-sync.js bump
}
finally {
    Pop-Location
}
