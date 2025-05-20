# Time Keeper

A modern, cross-platform desktop HUD app for time and task management.

## Features
- Minimalist always-on-top HUD (transparent, click-through)
- Local task management (add, repeat, list)
- Google Calendar integration (scaffolded, not yet complete)
- System tray with context menu
- Management window with sidebar (Tasks, HUD Options, About)
- Unified menu logic (tray + HUD hamburger)
- HUD options: dark mode, show time, click-through, opacity, reset

## Project Structure
```
Time Keeper/
  dist/           # Build output
  release/        # Electron packaged output
  src/
    main/         # Electron main process (calendar, tasks, tray, IPC)
    renderer/     # React UI (assets, components)
    shared/       # Shared types, menu definitions
  .env, package.json, tsconfig.json, vite.config.ts, ...
```

## Key Architectural Decisions
- Separation of concerns: `main` (Electron), `renderer` (React), `shared` (types, menu)
- IPC for task management and HUD settings sync
- Persistence: `electron-store` for tasks, `localStorage` for HUD settings
- Inline styles for rapid prototyping; dark mode and light mode supported
- Unified menu logic for tray and HUD

## Outstanding/Deferred Issues
- Hamburger menu clickability may have platform-specific quirks
- HUD options not yet persisted across app restarts in a cross-window way (currently localStorage + IPC)
- Google Calendar integration is scaffolded but not implemented
- Further enhancements possible: deeper settings persistence, improved click-through UX, more HUD options

## How to Resume Work with the AI
To continue development with the AI assistant, use the `TimeKeeper_AI_Prompt.md` file in the project root. This file contains a summary of the current state, architecture, and outstanding issues. Paste its contents into your next session to pick up where you left off.

## Getting Started
1. Install dependencies: `npm install`
2. Start the app in development: `npm run dev`
3. Build for production: `npm run build`

---

For more details, see the code and comments in each module.

**Author:** Termaine Jenkins (aka TJ)

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build the application:
```bash
npm run build
```

## Project Structure

```
time-keeper/
├── src/
│   ├── main.ts           # Main Electron process
│   └── renderer/         # Frontend React application
│       ├── index.html    # Main HTML file
│       └── renderer.tsx  # React components
├── package.json          # Project dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT

---

## Author

Created by **Termaine Jenkins** (aka **TJ**)

## ⚠️ Electron + Vite Asset Path Gotcha

When using Vite to build your renderer for Electron, you **must** set `base: './'` in your `vite.config.ts`:

```ts
export default defineConfig({
  // ...
  base: './', // Ensures all asset paths are relative for Electron
  // ...
});
```

**Why?**  
By default, Vite outputs asset paths with a leading slash (e.g., `/assets/index-xxxx.js`).  
When Electron loads your HTML from disk, a leading slash makes it look for the file at the root of the filesystem, not relative to the HTML file.  
Setting `base: './'` ensures Electron can always find your JS bundle and assets.

**Symptoms of this issue:**
- The HUD window shows only the title, not the React content.
- DevTools console shows `Failed to load resource: net::ERR_FILE_NOT_FOUND` for your JS bundle.
- No "Renderer JS loaded!" message in the console.

**How to fix:**
- Set `base: './'` in your Vite config.
- Rebuild your renderer. 

## Packaging for Release

### Prerequisites
- Node.js 16 or later
- npm 7 or later
- Git
- Platform-specific requirements:
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: build-essential package

### Building and Packaging

#### Windows
1. Open PowerShell as Administrator
2. Navigate to the project directory
3. Run the packaging script:
   ```powershell
   .\package-app.ps1
   ```
4. The packaged app will be in the `release` directory as `Time Keeper-Setup-1.0.0.exe`

#### macOS/Linux
1. Open Terminal
2. Navigate to the project directory
3. Make the script executable:
   ```bash
   chmod +x package-app.sh
   ```
4. Run the packaging script:
   ```bash
   ./package-app.sh
   ```
5. The packaged app will be in the `release` directory:
   - macOS: `Time Keeper.dmg`
   - Linux: `Time Keeper.AppImage`

### Package Configuration
The app is configured with the following packaging options:
```json
{
  "build": {
    "appId": "com.timekeeper.app",
    "productName": "Time Keeper",
    "win": {
      "target": "nsis",
      "artifactName": "${productName}-Setup-${version}.${ext}",
      "publisherName": "Termaine Jenkins",
      "verifyUpdateCodeSignature": false
    },
    "mac": {
      "target": "dmg"
    },
    "linux": {
      "target": "AppImage"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### Installation
- Windows: Run the `.exe` installer and follow the prompts
- macOS: Mount the `.dmg` and drag the app to Applications
- Linux: Make the `.AppImage` executable (`chmod +x`) and run it

### Troubleshooting
If you encounter any issues during packaging:

1. **Symbolic Link Errors**
   - Windows: Run PowerShell as Administrator
   - macOS/Linux: Ensure you have the necessary permissions

2. **Build Failures**
   ```bash
   # Windows
   Remove-Item -Recurse -Force node_modules, dist, release
   
   # macOS/Linux
   rm -rf node_modules dist release
   ```
   Then reinstall dependencies:
   ```bash
   npm install
   ```

3. **Platform-Specific Issues**
   - Windows: Ensure Visual Studio Build Tools are installed
   - macOS: Install Xcode Command Line Tools
   - Linux: Install build-essential package

4. **Code Signing**
   - Windows: Code signing is disabled by default (`verifyUpdateCodeSignature: false`)
   - macOS: Requires valid Apple Developer certificate
   - Linux: No code signing required for AppImage 