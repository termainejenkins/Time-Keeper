# Design Decisions – Time Keeper

This document details the major design choices made in the development of the Time Keeper desktop HUD app, with a focus on code structure, modularity, IPC, state management, styling, persistence, and UI/UX.

---

## 1. Project Structure & Modularity

**Decision:**
- The codebase is split into `src/main` (Electron main process), `src/renderer` (React UI), and `src/shared` (types, menu definitions).
- Features (e.g., calendar, tasks) are further modularized into their own folders under both `main` and `renderer`.

**Rationale:**
- Clear separation of concerns makes the codebase easier to reason about, maintain, and scale.
- Shared types and menu logic reduce duplication and ensure consistency between main and renderer processes.

**Alternatives Considered:**
- Flat structure (all code in one folder): rejected for maintainability.
- Monorepo with separate packages: not needed at current scale.

---

## 2. IPC (Inter-Process Communication)

**Decision:**
- Use Electron's IPC for communication between the main process and renderer windows.
- IPC handlers manage local tasks and HUD settings.

**Rationale:**
- Electron's security model requires separation between main and renderer.
- IPC allows for robust, type-safe communication and enables features like task management and settings sync.

**Alternatives Considered:**
- Exposing Node APIs directly to renderer (less secure, not recommended).

---

## 3. State Management

**Decision:**
- Local state is managed in React components using hooks (`useState`, `useEffect`).
- HUD settings are stored in localStorage and synced via IPC.
- Tasks are managed in the main process and accessed via IPC.

**Rationale:**
- React hooks provide simple, scalable state management for UI.
- Using localStorage for HUD settings allows for instant UI updates and persistence.
- IPC ensures that tasks and settings are consistent across windows.

**Alternatives Considered:**
- Global state libraries (Redux, Zustand): not needed at current scale.
- Shared store for settings (planned for future for cross-window sync).

---

## 4. Persistence

**Decision:**
- Use `electron-store` for persistent storage of tasks in the main process.
- Use `localStorage` for HUD settings in the renderer.

**Rationale:**
- `electron-store` is robust, simple, and works well for Electron apps.
- `localStorage` is easy for per-window settings and rapid prototyping.

**Alternatives Considered:**
- Using a database (SQLite, lowdb): overkill for current needs.
- Migrating all settings to `electron-store` (planned for future).

---

## 5. Styling & Theming

**Decision:**
- Use inline styles for all UI components.
- Support both dark mode and light mode, with dynamic color changes based on settings.

**Rationale:**
- Inline styles allow for rapid prototyping and easy dynamic theming.
- Dark mode is a key UX feature for a minimalist HUD.

**Alternatives Considered:**
- CSS Modules, styled-components, or other CSS-in-JS: may be adopted as the app grows.

---

## 6. Menu System

**Decision:**
- Menu definitions (tray, HUD hamburger) are shared in `src/shared/menu.ts`.
- Only global actions are unified; appearance toggles remain HUD-only.

**Rationale:**
- Sharing menu logic ensures consistency and reduces duplication.
- Keeping appearance toggles HUD-only avoids confusing global state.

---

## 7. UI/UX Choices

**Decision:**
- Minimalist, always-on-top HUD with click-through by default.
- Management window with sidebar navigation and live HUD preview.
- Responsive to dark mode and user settings.

**Rationale:**
- Minimalism keeps the HUD unobtrusive.
- Sidebar navigation is familiar and scalable.
- Live preview helps users understand settings changes instantly.

---

## 8. Outstanding/Deferred Issues

- Hamburger menu clickability is affected by platform-specific Electron quirks.
- HUD options are not yet persisted across app restarts in a cross-window way.
- Google Calendar integration is scaffolded but not implemented.
- Further enhancements (deeper settings persistence, improved click-through UX, more HUD options) are possible.

---

## 9. Task Management UI Evolution

**Decision:**
- Implemented inline editing for tasks instead of full-list replacement
- Added comprehensive dark mode support for task items
- Enhanced task update UX with better error handling and feedback

**Rationale:**
- Inline editing maintains context and reduces visual disruption
- Dark mode support improves usability in low-light conditions
- Better error handling improves reliability and user confidence

**Implementation Details:**
- Color scheme for dark mode:
  - Background: `#2c2f36` (dark) vs `#fff` (light)
  - Text: `#f3f3f3` (dark) vs `#222` (light)
  - Borders: `#444` (dark) vs `#eee` (light)
  - Secondary text: `#b3b3b3` (dark) vs `#888` (light)
- State management simplified to track editing by task ID
- Visual feedback enhanced with shadows and spacing

**Design Principles Applied:**
1. **Consistency**
   - Uniform spacing and padding
   - Consistent border radiuses
   - Cohesive color scheme

2. **Feedback**
   - Clear visual indicators for editing state
   - Immediate feedback on actions
   - Error states clearly communicated

3. **Accessibility**
   - High contrast ratios in both modes
   - Clear visual hierarchy
   - Readable font sizes and weights

4. **Efficiency**
   - Inline editing reduces context switching
   - Quick access to edit functionality
   - Streamlined update process

**Alternatives Considered:**
- Modal-based editing: rejected for disrupting context
- Full-list replacement: rejected for poor UX
- Separate edit window: rejected for complexity

---

## 10. Summary

These design choices prioritize modularity, maintainability, and a clean user experience. As the app grows, further improvements (shared settings store, advanced styling, more robust state management) are planned.

---

## 11. Manual Task Deletion

**Decision:**
- Added a Delete button to each task in the Task List, allowing users to manually remove tasks.

**Rationale:**
- Users need the ability to remove obsolete or unwanted tasks directly from the UI for better control and management.
- Immediate feedback and a simple workflow improve the overall user experience.

**Implementation Details:**
- The TaskList component now includes a Delete button next to the Edit button for each task.
- Clicking Delete removes the task from the UI instantly and sends a delete request to the main process via IPC.
- Error handling ensures the UI stays in sync with the backend.
- TypeScript error handling was improved for robustness.

**UI/UX Considerations:**
- The Delete button uses a red color scheme to indicate its destructive nature.
- Deletion is instant and does not require a page reload.
- The button is placed next to Edit for discoverability and convenience.

**Alternatives Considered:**
- Hiding delete behind a context menu: rejected for discoverability.
- Requiring confirmation for every delete: deferred for now, may be added as an option in the future. 