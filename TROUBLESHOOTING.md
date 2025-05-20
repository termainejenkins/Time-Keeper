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

## HUD Task Display Issues
- **Problem:** Tasks created in the options menu were not appearing in the HUD window.
- **Cause:** The HUD component's task calculation logic did not properly handle all repeat types (weekdays, weekends, every_other_day, custom).
- **Solution:** Enhanced the `getCurrentAndNextTask` function to support all repeat types and improved task occurrence calculations.
- **Technical Details:**
  - Added support for all repeat types in task occurrence calculations
  - Improved date handling for recurring tasks
  - Enhanced accuracy of next occurrence calculations
  - Better handling of task durations and intervals
- **Note:** The HUD now correctly displays all tasks, including those with complex repeat patterns.

## V8 Version Mismatch Error
- **Problem:** When starting the app, you may see an error like:
  ```
  Version mismatch between V8 binary and snapshot.
  V8 binary version: 13.6.233.8-electron.0
  Snapshot version: 12.0.267.19-electron.0
  ```
- **Cause:** This typically occurs when there's a mismatch between Electron versions in your dependencies, or when the node_modules directory has become corrupted.
- **Solution:**
  1. Clean up the project:
     ```bash
     # Windows
     Remove-Item -Recurse -Force node_modules, dist
     
     # Unix/Mac
     rm -rf node_modules dist
     ```
  2. Reinstall dependencies:
     ```bash
     npm install
     ```
  3. Rebuild and start the app:
     ```bash
     npm run dev
     ```
- **Note:** This issue is usually resolved by a clean reinstall of dependencies. If the problem persists, check your package.json for any conflicting Electron version requirements.

## Text Scaling and HUD Sizing Issues

### Problem: Text Not Scaling Properly
- **Symptoms:**
  - Text appears too large or small for the container
  - Text gets cut off or shows ellipsis unexpectedly
  - Inconsistent text sizes across the HUD
- **Causes:**
  - Container width not properly set
  - Minimum scale factor too restrictive
  - Font size settings conflicting with scaling
- **Solutions:**
  1. Check container width settings in HUD options
  2. Adjust minimum scale factor if text is too small
  3. Ensure font size settings are appropriate for the container
  4. Verify that the ScaledText component is receiving correct props

### Problem: HUD Size Controls Not Working
- **Symptoms:**
  - Size changes not reflected in the HUD
  - Preview not matching actual HUD
  - Size presets not applying correctly
- **Causes:**
  - Settings not being saved properly
  - IPC communication issues
  - State management problems
- **Solutions:**
  1. Check localStorage for saved settings
  2. Verify IPC communication in DevTools
  3. Ensure all size-related state is properly initialized
  4. Try resetting to default sizes and reapply

### Problem: Performance Issues with Size Changes
- **Symptoms:**
  - Lag when changing sizes
  - UI freezes during size updates
  - High CPU usage during transitions
- **Causes:**
  - Too frequent state updates
  - Heavy calculations during scaling
  - Inefficient transition handling
- **Solutions:**
  1. Use debouncing for size input changes
  2. Optimize scaling calculations
  3. Reduce transition complexity
  4. Consider using CSS transforms for better performance

### Best Practices
1. **Size Selection:**
   - Start with preset sizes before customizing
   - Consider screen resolution when choosing sizes
   - Test different combinations of width and height
   - Verify text readability at all sizes

2. **Text Scaling:**
   - Set appropriate minimum scale factor
   - Use consistent font sizes across components
   - Test with various text lengths
   - Verify ellipsis behavior

3. **Performance:**
   - Use size presets when possible
   - Avoid rapid size changes
   - Monitor CPU usage during transitions
   - Test on lower-end hardware

## Packaging Issues

### Problem: Symbolic Link Creation Errors
**Symptoms:**
- Error message: "Cannot create symbolic link: A required privilege is not held by the client"
- Build process fails during code signing tool extraction
- Repeated attempts to download and extract winCodeSign

**Causes:**
- Insufficient permissions on Windows
- Code signing tools requiring symbolic links
- Cross-platform build tools attempting to create macOS/Linux symlinks

**Solutions:**
1. For Windows builds:
   - Run PowerShell as Administrator
   - Or disable code signing verification in package.json:
     ```json
     "win": {
       "verifyUpdateCodeSignature": false
     }
     ```
2. For macOS/Linux builds:
   - Ensure proper permissions on build directory
   - Use sudo if necessary (not recommended for production builds)

### Problem: Build Fails During Packaging
**Symptoms:**
- Build process fails with errors
- Missing dependencies
- Incomplete builds
- Vite CJS deprecation warnings

**Causes:**
- Outdated dependencies
- Incomplete build process
- Platform-specific issues
- Vite configuration issues

**Solutions:**
1. Clean the project:
   ```bash
   # Windows
   Remove-Item -Recurse -Force node_modules, dist, release
   
   # macOS/Linux
   rm -rf node_modules dist release
   ```
2. Reinstall dependencies:
   ```bash
   npm install
   ```
3. Ensure all build scripts are working:
   ```bash
   npm run build:renderer
   npm run build:main
   ```
4. Check for platform-specific requirements:
   - Windows: Visual Studio Build Tools
   - macOS: Xcode Command Line Tools
   - Linux: build-essential package

### Problem: App Doesn't Start After Packaging
**Symptoms:**
- App crashes on launch
- White screen
- Missing assets
- "Failed to load resource" errors

**Causes:**
- Incorrect asset paths
- Missing dependencies
- Build configuration issues
- Vite base path configuration

**Solutions:**
1. Check the build configuration in `package.json`
2. Verify asset paths in `vite.config.ts`:
   ```typescript
   export default defineConfig({
     base: './', // Required for Electron
     // ...
   })
   ```
3. Test the app in development mode first
4. Check the logs in:
   - Windows: `%APPDATA%\Time Keeper\logs`
   - macOS: `~/Library/Logs/Time Keeper`
   - Linux: `~/.config/Time Keeper/logs`

### Problem: Installer Issues
**Symptoms:**
- Installer fails to run
- Installation incomplete
- Permission errors
- Missing shortcuts

**Causes:**
- Insufficient permissions
- Corrupted installer
- Antivirus interference
- NSIS configuration issues

**Solutions:**
1. Run installer as administrator
2. Temporarily disable antivirus
3. Verify installer integrity
4. Check NSIS configuration in package.json:
   ```json
   "nsis": {
     "oneClick": false,
     "allowToChangeInstallationDirectory": true,
     "createDesktopShortcut": true,
     "createStartMenuShortcut": true
   }
   ```

### Best Practices
1. **Before Packaging:**
   - Test all features in development
   - Update all dependencies
   - Clean build directories
   - Verify platform-specific requirements
   - Check Vite configuration

2. **During Packaging:**
   - Monitor build logs
   - Check for warnings
   - Verify file sizes
   - Test on clean system
   - Use appropriate permissions

3. **After Packaging:**
   - Test installation process
   - Verify all features
   - Check file associations
   - Test auto-updates
   - Verify shortcuts and start menu entries

4. **Platform-Specific:**
   - Windows: Test on different Windows versions
   - macOS: Test on different macOS versions
   - Linux: Test on different distributions
   - Consider using CI/CD for cross-platform builds

_Add new issues and solutions here as they are discovered!_ 