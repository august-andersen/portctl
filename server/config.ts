import fs from 'fs';
import path from 'path';
import type { PortctlConfig } from '../shared/types.js';

const PORTCTL_DIR = path.join(process.env.HOME ?? '~', '.portctl');
const CONFIG_PATH = path.join(PORTCTL_DIR, 'config.json');
const BACKUP_PATH = path.join(PORTCTL_DIR, '.config.json.bak');
const PID_PATH = path.join(PORTCTL_DIR, 'portctl.pid');
const LOG_DIR = path.join(PORTCTL_DIR, 'logs');
const DAEMON_LOG = path.join(LOG_DIR, 'daemon.log');

export const paths = {
  portctlDir: PORTCTL_DIR,
  config: CONFIG_PATH,
  backup: BACKUP_PATH,
  pid: PID_PATH,
  logDir: LOG_DIR,
  daemonLog: DAEMON_LOG,
} as const;

const DEFAULT_CONFIG: PortctlConfig = {
  version: 1,
  settings: {
    dashboardPort: 47777,
    pollingInterval: 1000,
    defaultView: 'card',
    theme: 'dark',
    cardClickBehavior: 'openBrowser',
    logBufferSize: 10000,
  },
  reservations: [],
  blockedPorts: [],
  pinnedPorts: [],
  tags: {},
  cardOrder: [],
  customRestartCommands: {},
  hiddenProcesses: [],
  customNames: {},
};

export function ensureDirectories(): void {
  fs.mkdirSync(PORTCTL_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function readConfig(): PortctlConfig {
  ensureDirectories();
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PortctlConfig>;
      // Merge with defaults to handle missing fields after upgrades
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        settings: { ...DEFAULT_CONFIG.settings, ...(parsed.settings ?? {}) },
      };
    }
  } catch {
    // Corrupt config — backup and recreate
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const timestamp = Date.now();
        fs.copyFileSync(CONFIG_PATH, `${BACKUP_PATH}.corrupt.${timestamp}`);
      }
    } catch {
      // Ignore backup failure
    }
  }
  writeConfig(DEFAULT_CONFIG);
  return { ...DEFAULT_CONFIG };
}

export function writeConfig(config: PortctlConfig): void {
  ensureDirectories();
  // Backup current config before writing
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      fs.copyFileSync(CONFIG_PATH, BACKUP_PATH);
    }
  } catch {
    // Ignore backup failure
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function updateConfig(updater: (config: PortctlConfig) => PortctlConfig): PortctlConfig {
  const config = readConfig();
  const updated = updater(config);
  writeConfig(updated);
  return updated;
}

export function writePid(pid: number): void {
  ensureDirectories();
  fs.writeFileSync(PID_PATH, String(pid), 'utf-8');
}

export function readPid(): number | null {
  try {
    if (fs.existsSync(PID_PATH)) {
      const pid = parseInt(fs.readFileSync(PID_PATH, 'utf-8').trim(), 10);
      if (!isNaN(pid) && pid > 0) return pid;
    }
  } catch {
    // Ignore
  }
  return null;
}

export function removePid(): void {
  try {
    if (fs.existsSync(PID_PATH)) {
      fs.unlinkSync(PID_PATH);
    }
  } catch {
    // Ignore
  }
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
