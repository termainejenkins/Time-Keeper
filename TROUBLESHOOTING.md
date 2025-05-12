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

## Hamburger Menu Clickability Issues
- **Problem:** On some platforms, the HUD's hamburger menu may not be clickable, or only partially clickable, when the window is transparent and set to click-through mode.
- **Cause:** Electron's `setIgnoreMouseEvents(true, { forward: true })` and transparent windows can behave differently across Windows, macOS, and Linux. Hit-testing for UI elements over transparent backgrounds is not always reliable.
- **Workarounds:**
  - Try toggling click-through mode off in the HUD options.
  - Ensure the hamburger menu button is rendered outside any pointer-events: none containers.
  - If the issue persists, consider using a non-transparent background or adjusting the HUD window's z-order.
- **Note:** This is a known Electron limitation. Future Electron updates or custom hit-testing logic may improve this.

## HUD Options Not Persisting Across App Restarts (All Windows)
- **Problem:** HUD options (dark mode, opacity, etc.) are saved in localStorage and sent via IPC, but may not persist or sync across all windows after a full app restart.
- **Cause:** localStorage is per-window and not shared. IPC syncs settings at runtime, but on restart, only the window that set the options will have the correct state.
- **Workarounds:**
  - Manually re-apply settings in each window after restart.
  - For robust persistence, migrate settings to a shared store (e.g., `electron-store`) and load them in all windows at startup.
- **Note:** This is a planned enhancement for future versions.

## Google Calendar Integration Not Yet Implemented
- **Problem:** Google Calendar integration is scaffolded but not functional.
- **Cause:** The codebase includes placeholders for Google Calendar logic, but authentication, event fetching, and sync are not yet implemented.
- **Workarounds:**
  - Use local task management for now.
  - Monitor the project README and changelog for updates on Google Calendar support.
- **Note:** Full Google Calendar integration is a future milestone.

## Task Update UI Flickering Issue
- **Problem:** When updating a task, the UI would go blank momentarily before showing the updated task.
- **Cause:** The task update flow was waiting for the IPC response before updating the UI, causing a visual delay.
- **Solution:** Implemented optimistic updates:
  - UI updates immediately with the new task data
  - IPC calls happen in the background
  - Error handling ensures data consistency if the update fails
- **Technical Details:**
  - TaskForm now calls `onTaskAdded` before making IPC calls
  - TaskList updates local state immediately
  - Edit mode exits smoothly before any async operations
  - Error handling refreshes the list only if needed
- **Note:** This change improves the user experience by making updates appear instant while maintaining data consistency.

_Add new issues and solutions here as they are discovered!_ 