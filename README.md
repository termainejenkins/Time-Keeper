# Time Keeper

A minimalist desktop HUD application that syncs with Google Calendar and displays countdown timers for your tasks.

**Author:** Termaine Jenkins (aka TJ)

## Features

- Transparent, always-on-top HUD display
- Google Calendar integration
- Task countdown timers
- Cross-platform support (Windows, macOS, Linux)
- Minimalist and non-intrusive design

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