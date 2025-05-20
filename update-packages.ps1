# Update all packages to their latest versions
Write-Host "Updating all packages to their latest versions..."

# First, let's clean up
Write-Host "Cleaning up..."
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Update all packages
Write-Host "Installing latest versions..."
npm install

# Update dev dependencies
Write-Host "Updating dev dependencies..."
npm install --save-dev @types/jest@latest @types/node@latest @types/react@latest @types/react-dom@latest @types/uuid@latest @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest @vitejs/plugin-react@latest copyfiles@latest electron@latest electron-builder@latest eslint@latest jest@latest prettier@latest ts-jest@latest typescript@latest vite@latest vite-plugin-static-copy@latest @testing-library/jest-dom@latest @testing-library/react@latest @testing-library/user-event@latest husky@latest lint-staged@latest

# Update dependencies
Write-Host "Updating dependencies..."
npm install --save electron-oauth2@latest electron-store@latest electron-updater@latest framer-motion@latest googleapis@latest react@latest react-dom@latest tailwindcss@latest uuid@latest

Write-Host "Package update complete!"
Write-Host "Please test the application thoroughly after the update." 