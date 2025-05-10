# Time Keeper

A minimalist desktop HUD application that syncs with Google Calendar and displays countdown timers for your tasks.

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