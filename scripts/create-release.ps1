# Create a new release
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('patch', 'minor', 'major')]
    [string]$Type
)

# Get current version
$package = Get-Content package.json | ConvertFrom-Json
$version = $package.version
$parts = $version.Split('.')
$major = [int]$parts[0]
$minor = [int]$parts[1]
$patch = [int]$parts[2]

# Increment version based on type
switch ($Type) {
    'patch' { $patch++ }
    'minor' { $minor++; $patch = 0 }
    'major' { $major++; $minor = 0; $patch = 0 }
}

$newVersion = "$major.$minor.$patch"
Write-Host "Creating release for version $newVersion"

# Update package.json
$package.version = $newVersion
$package | ConvertTo-Json -Depth 100 | Set-Content package.json

# Create git tag
$tag = "v$newVersion"
git add package.json
git commit -m "chore: bump version to $newVersion"
git tag -a $tag -m "Release version $newVersion"
git push
git push --tags

Write-Host "Release process started for version $newVersion"
Write-Host "Check GitHub Actions for build progress" 