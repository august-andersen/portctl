#!/usr/bin/env node

// portctl CLI entry point
// Delegates to daemon management functions

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const command = process.argv[2];

  // Dynamic import to support both dev (tsx) and production (compiled js)
  let daemon;
  try {
    daemon = await import(path.join(__dirname, '..', 'dist', 'server', 'daemon.js'));
  } catch {
    try {
      daemon = await import(path.join(__dirname, '..', 'server', 'daemon.ts'));
    } catch {
      console.error('portctl: Could not load daemon module. Run install.sh or npm run build.');
      process.exit(1);
    }
  }

  switch (command) {
    case 'start':
      daemon.startDaemon();
      break;
    case 'stop':
      daemon.stopDaemon();
      break;
    case 'restart':
      daemon.restartDaemon();
      break;
    case 'status':
      daemon.printStatus();
      break;
    case 'open':
      daemon.openDashboard();
      break;
    case 'uninstall':
      await daemon.uninstallPortctl();
      break;
    default:
      console.log(`
portctl — manage processes listening on network ports

Usage:
  portctl start       Start the dashboard daemon
  portctl stop        Stop the daemon
  portctl restart     Restart the daemon
  portctl status      Show daemon status
  portctl open        Open dashboard in browser
  portctl uninstall   Remove portctl completely

Dashboard: http://127.0.0.1:47777 (default)
`);
      break;
  }
}

main().catch((err) => {
  console.error('portctl error:', err.message);
  process.exit(1);
});
