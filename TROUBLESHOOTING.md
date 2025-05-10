# Troubleshooting Guide

## Electron + Vite Asset Path Issue

### Problem
When using Vite to build your renderer for Electron, the HUD window may show only the title and not the React content. The DevTools console may show:
- `Failed to load resource: net::ERR_FILE_NOT_FOUND` for your JS bundle
- No "Renderer JS loaded!" message

### Cause
By default, Vite outputs asset paths with a leading slash (e.g., `/assets/index-xxxx.js`). When Electron loads your HTML from disk, a leading slash makes it look for the file at the root of the filesystem, not relative to the HTML file.

### Solution
Set `base: './'` in your `vite.config.ts`:

```ts
export default defineConfig({
  // ...
  base: './', // Ensures all asset paths are relative for Electron
  // ...
});
```

Then rebuild your renderer:
```bash
npm run build:renderer
```

This ensures Electron can always find your JS bundle and assets.

---

_Add new issues and solutions here as they are discovered!_ 