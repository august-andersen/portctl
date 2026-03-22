#!/usr/bin/env node

// portctl CLI entry point
// Bootstraps through tsx to handle TypeScript server modules directly.

import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Resolve the local tsx binary (installed as a production dependency)
const tsxBin = path.join(ROOT, 'node_modules', '.bin', 'tsx');
const daemonScript = path.join(ROOT, 'server', 'daemon.ts');
const serverScript = path.join(ROOT, 'server', 'index.ts');
const configScript = path.join(ROOT, 'server', 'config.ts');
const pidFile = path.join(process.env.HOME ?? '~', '.portctl', 'portctl.pid');
const logDir = path.join(process.env.HOME ?? '~', '.portctl', 'logs');
const daemonLog = path.join(logDir, 'daemon.log');
const configFile = path.join(process.env.HOME ?? '~', '.portctl', 'config.json');

function ensureDirs() {
  fs.mkdirSync(path.join(process.env.HOME ?? '~', '.portctl', 'logs'), { recursive: true });
}

function readPid() {
  try {
    if (fs.existsSync(pidFile)) {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
      if (!isNaN(pid) && pid > 0) return pid;
    }
  } catch {}
  return null;
}

function isRunning(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function getPort() {
  try {
    if (fs.existsSync(configFile)) {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      return config.settings?.dashboardPort ?? 47777;
    }
  } catch {}
  return 47777;
}

function getDashboardUrl() {
  return `http://127.0.0.1:${getPort()}`;
}

// ── Commands ──

function start() {
  const existingPid = readPid();
  if (existingPid && isRunning(existingPid)) {
    console.log(`portctl is already running (PID ${existingPid})`);
    console.log(`Dashboard: ${getDashboardUrl()}`);
    return;
  }

  ensureDirs();
  const logFd = fs.openSync(daemonLog, 'a');
  const port = getPort();

  const child = spawn(tsxBin, [serverScript], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: {
      ...process.env,
      PORTCTL_PORT: String(port),
      PORTCTL_DAEMON: '1',
    },
    cwd: ROOT,
  });

  if (child.pid) {
    fs.writeFileSync(pidFile, String(child.pid), 'utf-8');
    child.unref();
    console.log(`portctl started (PID ${child.pid})`);
    console.log(`Dashboard: http://127.0.0.1:${port}`);
  } else {
    console.error('Failed to start portctl daemon');
    process.exit(1);
  }
}

function stop() {
  const pid = readPid();
  if (!pid || !isRunning(pid)) {
    console.log('portctl is not running');
    try { fs.unlinkSync(pidFile); } catch {}
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
    // Wait up to 3s for graceful shutdown
    const start = Date.now();
    while (Date.now() - start < 3000 && isRunning(pid)) {
      execSync('sleep 0.1');
    }
    if (isRunning(pid)) {
      process.kill(pid, 'SIGKILL');
    }
  } catch {}

  try { fs.unlinkSync(pidFile); } catch {}
  console.log('portctl stopped');
}

function restart() {
  stop();
  start();
}

function status() {
  const pid = readPid();
  if (pid && isRunning(pid)) {
    console.log(`Status:    running`);
    console.log(`PID:       ${pid}`);
    console.log(`Dashboard: ${getDashboardUrl()}`);
    try {
      const etime = execSync(`ps -p ${pid} -o etime=`, { encoding: 'utf-8' }).trim();
      console.log(`Uptime:    ${etime}`);
    } catch {}
  } else {
    if (pid) try { fs.unlinkSync(pidFile); } catch {}
    console.log('Status: stopped');
  }
}

function open() {
  const pid = readPid();
  if (!pid || !isRunning(pid)) {
    console.log('portctl is not running. Start it with: portctl start');
    return;
  }
  try {
    execSync(`open ${getDashboardUrl()}`);
  } catch {
    console.log(`Open in your browser: ${getDashboardUrl()}`);
  }
}

async function uninstall() {
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question('Are you sure you want to uninstall portctl? This will remove all data. [y/N] ', (answer) => {
    rl.close();
    if (answer.toLowerCase() !== 'y') {
      console.log('Uninstall cancelled');
      return;
    }

    stop();

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

    // Remove ~/.portctl data directory
    const portctlDir = path.join(process.env.HOME ?? '~', '.portctl');
    try {
      fs.rmSync(portctlDir, { recursive: true, force: true });
      console.log('Removed ~/.portctl');
    } catch {
      console.log('Could not remove ~/.portctl');
    }

    console.log('portctl uninstalled');
  });
}

// ── Main ──

const command = process.argv[2];

switch (command) {
  case 'start':   start();   break;
  case 'stop':    stop();    break;
  case 'restart': restart(); break;
  case 'status':  status();  break;
  case 'open':    open();    break;
  case 'uninstall': uninstall(); break;
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
