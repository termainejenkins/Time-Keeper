# Clean up previous builds
Write-Host "Cleaning up previous builds..."
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist, release

# Install dependencies
Write-Host "Installing dependencies..."
npm install

# Build the app
Write-Host "Building the app..."
npm run build

# Package the app
Write-Host "Packaging the app..."
npm run package:win

Write-Host "Build complete! Check the 'release' directory for the packaged app." 