# Time Keeper – AI Session Resume Prompt

## Project Overview
- **Type:** Cross-platform desktop HUD app
- **Stack:** Electron, React, Vite, TypeScript
- **Features:**
  - Minimalist always-on-top HUD (transparent, click-through)
  - Local task management (add, repeat, list)
  - Google Calendar integration (scaffolded)
  - System tray with context menu
  - Management window with sidebar (Tasks, HUD Options, About)
  - Unified menu logic (tray + HUD hamburger)
  - HUD options: dark mode, show time, click-through, opacity, reset

## Directory Structure
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
- **Separation of concerns:** `main` (Electron), `renderer` (React), `shared` (types, menu)
- **IPC:** Used for task management and HUD settings sync
- **Persistence:** `electron-store` for tasks, `localStorage` for HUD settings
- **Styling:** Inline styles for rapid prototyping; dark mode and light mode supported
- **Menu:** Unified menu logic for tray and HUD

## Best Practices Review
- ✅ Clean modular structure
- ✅ Shared types and menu logic
- ✅ State managed at appropriate levels
- ⚠️ Inline styles (consider CSS-in-JS or CSS Modules as app grows)
- ⚠️ No tests yet (add unit/integration tests as needed)
- ⚠️ Error handling basic (improve for IPC/storage/network)

## Outstanding/Deferred Issues
- Hamburger menu clickability may have platform-specific quirks
- HUD options not yet persisted across app restarts in a cross-window way (currently localStorage + IPC)
- Google Calendar integration is scaffolded but not implemented
- Further enhancements possible: deeper settings persistence, improved click-through UX, more HUD options

## UI State (as of last session)
- Management window: dark mode and light mode, no white space around edges (almost perfect)
- Sidebar and main content fill window, text is readable in both modes
- HUD preview and About section adapt to dark mode

---

## Prompt to Resume Work

**You are an AI coding assistant. The project is a modular Electron + React + Vite desktop HUD app with local task management and Google Calendar integration. The codebase is clean and follows best practices.**

**Today, please help me continue development from this state.**
- If I ask for a feature, bug fix, or review, use the context above.
- If I ask for a summary, use this file.
- If I ask for next steps, suggest improvements based on the above.

**Key context:**
- Project structure and modularity are good.
- Outstanding issues are listed above.
- UI is nearly perfect, but some edge white space remains.
- Google Calendar integration is not yet complete.

---

**Let's pick up where we left off!** 