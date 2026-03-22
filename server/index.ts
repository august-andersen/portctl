import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readConfig, removePid, ensureDirectories } from './config.js';
import { startPolling, stopPolling, getCurrentProcesses } from './discovery.js';
import { router, pushToast } from './routes.js';
import { checkReservations, executeMigrations, checkBlockedPorts } from './reservation.js';
import { logCapture } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

ensureDirectories();
const config = readConfig();
const PORT = parseInt(process.env.PORTCTL_PORT ?? String(config.settings.dashboardPort), 10);

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use(router);

// Serve static frontend in production
const clientDist = path.resolve(__dirname, '..', 'dist', 'client');
const clientDistAlt = path.resolve(__dirname, '..', 'client', 'dist');
const clientDir = path.resolve(__dirname, '..', 'dist', 'client');

// Try multiple possible locations for built client
import fs from 'fs';
let staticDir: string | null = null;
for (const dir of [clientDist, clientDistAlt, clientDir]) {
  if (fs.existsSync(path.join(dir, 'index.html'))) {
    staticDir = dir;
    break;
  }
}

if (staticDir) {
  app.use(express.static(staticDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDir!, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send(`
      <html>
        <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f172a; color: #e2e8f0;">
          <div style="text-align: center;">
            <h1>portctl</h1>
            <p>Frontend not built yet. Run <code style="background: #1e293b; padding: 4px 8px; border-radius: 4px;">npm run build:client</code></p>
            <p style="margin-top: 20px; color: #64748b;">API is running at <a href="/api/status" style="color: #3b82f6;">/api/status</a></p>
          </div>
        </body>
      </html>
    `);
  });
}

// Start process discovery polling
startPolling((processes) => {
  // Cleanup stale log captures
  const activePids = new Set(processes.map((p) => p.pid));
  logCapture.cleanupStaleProcesses(activePids);

  // Check blocked ports
  checkBlockedPorts(processes, pushToast);

  // Check reservations and auto-migrate
  const migrations = checkReservations(processes);
  if (migrations.length > 0) {
    executeMigrations(migrations, pushToast);
  }
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`portctl dashboard running at http://127.0.0.1:${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log('portctl shutting down...');
  stopPolling();
  server.close();
  removePid();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
