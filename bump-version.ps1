$manifestPath = "manifest.json"
$manifest = Get-Content $manifestPath | ConvertFrom-Json

$versionParts = $manifest.version -split '\.'
$major = [int]$versionParts[0]
$minor = [int]$versionParts[1]
$patch = [int]$versionParts[2]

$patch++
if ($patch -gt 99) {
    $patch = 0
    $minor++
    if ($minor -gt 99) {
        $minor = 0
        $major++
    }
}

$manifest.version = "$major.$minor.$patch"
$manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8
Write-Host "manifest.json version bumped to $($manifest.version)"
