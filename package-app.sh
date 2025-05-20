#!/bin/bash

# Clean up previous builds
echo "Cleaning up previous builds..."
rm -rf dist release

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the app
echo "Building the app..."
npm run build

# Package the app
echo "Packaging the app..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    npm run package:mac
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    npm run package:linux
else
    # Default to all platforms
    npm run package
fi

echo "Build complete! Check the 'release' directory for the packaged app." 