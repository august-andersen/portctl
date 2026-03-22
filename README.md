# portctl

A local macOS web dashboard for managing processes listening on network ports.

Stop memorizing `lsof` commands and PIDs. **portctl** gives you a persistent web UI to see, manage, and organize everything running on your local ports.

## Features

- **Live Dashboard** — Real-time card and table views of all processes listening on TCP ports
- **Kill / Suspend / Resume** — Manage processes with one click
- **Switch Ports** — Move a process to a different port automatically (detects `--port`, `-p`, `PORT=`, etc.)
- **Port Reservations** — Reserve a port for a specific process. portctl auto-migrates it when it starts on the wrong port.
- **Block Ports** — Automatically kill any process that binds to a blocked port
- **Pin Ports** — Keep port cards visible even when no process is running
- **Custom Tags** — Add tags to processes for filtering and organization
- **Drag-and-Drop** — Reorder cards to your preference (persisted)
- **Log Viewer** — View stdout/stderr for processes managed by portctl
- **Dark/Light Theme** — Persistent theme preference
- **Background Daemon** — Runs silently, survives terminal close, accessible from any terminal

## Quick Start

```bash
# Install
curl -fsSL https://raw.githubusercontent.com/august-andersen/portctl/main/install.sh | bash

# Start the daemon
portctl start

# Open the dashboard
portctl open
```

## CLI Reference

| Command              | Description                                  |
|----------------------|----------------------------------------------|
| `portctl start`      | Start the dashboard daemon                   |
| `portctl stop`       | Stop the daemon                              |
| `portctl restart`    | Restart the daemon                           |
| `portctl status`     | Show daemon status, PID, uptime, and URL     |
| `portctl open`       | Open dashboard in default browser            |
| `portctl uninstall`  | Remove portctl completely (prompts for confirmation) |

## Configuration

Config is stored at `~/.portctl/config.json`. You can edit it directly or use the Settings panel in the dashboard.

```json
{
  "settings": {
    "dashboardPort": 47777,
    "pollingInterval": 1000,
    "defaultView": "card",
    "theme": "dark",
    "cardClickBehavior": "openBrowser",
    "logBufferSize": 10000
  },
  "reservations": [],
  "blockedPorts": [],
  "pinnedPorts": [],
  "tags": {},
  "cardOrder": [],
  "customRestartCommands": {}
}
```

## Port Reservations

Reservations are the key "smart" feature. They ensure a process always ends up on its designated port.

**Example workflow:**
1. Start your dev server — it binds to port 3000
2. In the dashboard, click **Switch Port** and move it to port 5173
3. Click the three-dot menu → **Reserve Port**
4. portctl saves a matcher (e.g., command contains "my-app")
5. Next time you start the server and it binds to 3000, portctl automatically kills it and restarts on 5173

**Matcher types:**
- `command_contains` — the process command includes a substring
- `process_name` — exact match on the binary name
- `working_directory` — launched from a specific directory
- `regex` — regex match on the command string

## Development

```bash
# Clone the repo
git clone https://github.com/august-andersen/portctl.git
cd portctl

# Install dependencies
npm install

# Run the backend (with hot reload)
npm run dev:server

# Run the frontend dev server (separate terminal)
npm run dev:client

# Build everything
npm run build
```

The frontend dev server proxies `/api` requests to the backend at `http://127.0.0.1:47777`.

## Architecture

```
portctl/
├── bin/portctl.js       # CLI entry point
├── server/              # Express backend
│   ├── index.ts         # Server setup and static file serving
│   ├── daemon.ts        # Daemon start/stop/status management
│   ├── discovery.ts     # Process discovery via lsof + ps
│   ├── actions.ts       # Kill, suspend, resume, move port
│   ├── config.ts        # JSON config read/write
│   ├── logger.ts        # Log capture and buffering
│   ├── reservation.ts   # Port reservation matching and auto-migration
│   └── routes.ts        # REST API routes
├── client/              # React + Vite frontend
│   └── src/
│       ├── App.tsx
│       ├── hooks/       # useProcesses polling hook
│       └── components/  # Card, Table, Settings, Modals
└── shared/
    └── types.ts         # Shared TypeScript interfaces
```

## Uninstall

```bash
portctl uninstall
```

Or manually:
```bash
portctl stop
rm -rf ~/.portctl
rm /usr/local/bin/portctl
```

## License

MIT
