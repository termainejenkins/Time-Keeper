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