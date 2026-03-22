import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { paths, readConfig, readPid, removePid, isProcessRunning, writePid, ensureDirectories } from './config.js';

const SERVER_ENTRY = path.resolve(import.meta.dirname ?? '.', 'index.js');
// When running with tsx in dev, point to the TS source
const SERVER_ENTRY_DEV = path.resolve(import.meta.dirname ?? '.', 'index.ts');

function getServerEntry(): string {
  // Prefer compiled JS, fall back to TS (for dev with tsx)
  if (fs.existsSync(SERVER_ENTRY)) return SERVER_ENTRY;
  return SERVER_ENTRY_DEV;
}

export function getDashboardUrl(): string {
  const config = readConfig();
  return `http://127.0.0.1:${config.settings.dashboardPort}`;
}

export function daemonStatus(): { running: boolean; pid: number | null; url: string } {
  const pid = readPid();
  const url = getDashboardUrl();
  if (pid !== null && isProcessRunning(pid)) {
    return { running: true, pid, url };
  }
  // Stale PID file
  if (pid !== null) removePid();
  return { running: false, pid: null, url };
}

export function startDaemon(): void {
  const status = daemonStatus();
  if (status.running) {
    console.log(`portctl is already running (PID ${status.pid})`);
    console.log(`Dashboard: ${status.url}`);
    return;
  }

  ensureDirectories();
  const config = readConfig();

  const logFile = fs.openSync(paths.daemonLog, 'a');

  // Use tsx for .ts files, node for .js files
  const entry = getServerEntry();
  const isTsFile = entry.endsWith('.ts');
  const command = isTsFile ? 'tsx' : 'node';

  const child = spawn(command, [entry], {
    detached: true,
    stdio: ['ignore', logFile, logFile],
    env: {
      ...process.env,
      PORTCTL_PORT: String(config.settings.dashboardPort),
      PORTCTL_DAEMON: '1',
    },
    cwd: path.dirname(entry),
  });

  if (child.pid) {
    writePid(child.pid);
    child.unref();
    console.log(`portctl started (PID ${child.pid})`);
    console.log(`Dashboard: http://127.0.0.1:${config.settings.dashboardPort}`);
  } else {
    console.error('Failed to start portctl daemon');
    process.exit(1);
  }
}

export function stopDaemon(): void {
  const status = daemonStatus();
  if (!status.running || !status.pid) {
    console.log('portctl is not running');
    return;
  }

  try {
    process.kill(status.pid, 'SIGTERM');
    // Wait up to 3 seconds for graceful shutdown
    let waited = 0;
    while (waited < 3000 && isProcessRunning(status.pid)) {
      execSync('sleep 0.1');
      waited += 100;
    }
    if (isProcessRunning(status.pid)) {
      process.kill(status.pid, 'SIGKILL');
    }
    removePid();
    console.log('portctl stopped');
  } catch {
    removePid();
    console.log('portctl stopped (was already exiting)');
  }
}

export function restartDaemon(): void {
  stopDaemon();
  startDaemon();
}

export function openDashboard(): void {
  const status = daemonStatus();
  if (!status.running) {
    console.log('portctl is not running. Start it with: portctl start');
    return;
  }
  try {
    execSync(`open ${status.url}`);
  } catch {
    console.log(`Open in your browser: ${status.url}`);
  }
}

export function printStatus(): void {
  const status = daemonStatus();
  if (status.running) {
    console.log(`Status:    running`);
    console.log(`PID:       ${status.pid}`);
    console.log(`Dashboard: ${status.url}`);
    // Try to get uptime from the pid
    if (status.pid) {
      try {
        const etime = execSync(`ps -p ${status.pid} -o etime=`, { encoding: 'utf-8' }).trim();
        console.log(`Uptime:    ${etime}`);
      } catch {
        // Ignore
      }
    }
  } else {
    console.log('Status: stopped');
  }
}

export async function uninstallPortctl(): Promise<void> {
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise<void>((resolve) => {
    rl.question('Are you sure you want to uninstall portctl? This will remove all data. [y/N] ', (answer) => {
      rl.close();
      if (answer.toLowerCase() !== 'y') {
        console.log('Uninstall cancelled');
        resolve();
        return;
      }

      // Stop daemon
      stopDaemon();

      // Remove symlink
      try {
        const symlinkPath = '/usr/local/bin/portctl';
        if (fs.existsSync(symlinkPath)) {
          fs.unlinkSync(symlinkPath);
          console.log('Removed CLI symlink');
        }
      } catch {
        console.log('Could not remove /usr/local/bin/portctl (may need sudo)');
      }

      // Remove portctl directory
      try {
        fs.rmSync(paths.portctlDir, { recursive: true, force: true });
        console.log('Removed ~/.portctl');
      } catch {
        console.log('Could not remove ~/.portctl');
      }

      console.log('portctl uninstalled');
      resolve();
    });
  });
}
