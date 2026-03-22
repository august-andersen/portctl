import { execSync } from 'child_process';
import type { PortProcess, ProcessType, ProcessStatus } from '../shared/types.js';
import { readConfig } from './config.js';

// Process classification patterns
const WEB_PATTERNS = [
  /vite/, /next/, /webpack-dev-server/, /react-scripts/, /http-server/, /serve\b/,
  /flask/, /django/, /uvicorn/, /gunicorn/, /rails/, /puma/, /webrick/, /php/,
  /nuxt/, /gatsby/, /astro/, /remix/, /svelte/,
  /http\.server/, /SimpleHTTPServer/, /streamlit/,
];

const API_PATTERNS = [
  /express/, /fastify/, /koa/, /hapi/, /nest/,
  /flask/, /django/, /fastapi/,
  /gin/, /echo/, /fiber/,
];

const DATABASE_PATTERNS = [
  /postgres/, /mysql/, /mysqld/, /mongo/, /mongod/, /redis-server/, /redis/,
  /sqlite/, /cockroach/, /cassandra/, /elastic/, /influx/, /mariadb/,
];

const SYSTEM_PATTERNS = [
  /mDNSResponder/, /AirPlay/, /rapportd/, /sharingd/, /WiFi/,
  /controlce/, /airportd/, /configd/, /SystemUI/,
  /launchd/, /kernel_task/, /WindowServer/,
];

function classifyProcess(name: string, command: string, workingDirectory: string): ProcessType {
  const combined = `${name} ${command}`.toLowerCase();

  for (const pat of DATABASE_PATTERNS) {
    if (pat.test(combined)) return 'database';
  }
  for (const pat of SYSTEM_PATTERNS) {
    if (pat.test(combined)) return 'system';
  }
  for (const pat of WEB_PATTERNS) {
    if (pat.test(combined)) return 'web';
  }
  for (const pat of API_PATTERNS) {
    if (pat.test(combined)) return 'api';
  }

  // Heuristic: if it's a node process, likely web/api
  if (/\bnode\b/i.test(name)) return 'web';

  // Heuristic: Python/Ruby running from a project directory (not /) is likely a web server
  if (/\b(python|ruby|php)\b/i.test(name) && workingDirectory && workingDirectory !== '/') {
    return 'web';
  }

  return 'system';
}

function isSystemProcess(name: string, command: string): boolean {
  const combined = `${name} ${command}`.toLowerCase();
  return SYSTEM_PATTERNS.some((pat) => pat.test(combined));
}

interface LsofEntry {
  pid: number;
  name: string;
  port: number;
}

function parseLsofOutput(output: string): LsofEntry[] {
  const entries: LsofEntry[] = [];
  const lines = output.split('\n').filter((line) => line.trim());

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // lsof output format: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
    const parts = line.split(/\s+/);
    if (parts.length < 9) continue;

    const name = parts[0];
    const pid = parseInt(parts[1], 10);
    // NAME column is second-to-last (last is "(LISTEN)")
    // Find the part containing a port pattern like *:3000 or 127.0.0.1:8080
    let portMatch: RegExpMatchArray | null = null;
    let namePart = '';
    for (let j = parts.length - 1; j >= 8; j--) {
      const match = parts[j].match(/:(\d+)$/);
      if (match) {
        portMatch = match;
        namePart = parts[j];
        break;
      }
    }
    if (!portMatch) continue;

    const port = parseInt(portMatch[1], 10);
    if (isNaN(pid) || isNaN(port)) continue;

    entries.push({ pid, name, port });
  }

  return entries;
}

interface ProcessDetails {
  command: string;
  cpuPercent: number;
  memoryMB: number;
  startTime: string;
  uptime: string;
  status: ProcessStatus;
}

// Batch-fetch details for all PIDs in minimal ps calls
function getBatchProcessDetails(pids: number[]): Map<number, ProcessDetails> {
  const result = new Map<number, ProcessDetails>();
  if (pids.length === 0) return result;

  const pidList = pids.join(',');
  const defaults: ProcessDetails = { command: '', cpuPercent: 0, memoryMB: 0, startTime: '', uptime: '', status: 'running' };

  // Initialize all with defaults
  for (const pid of pids) {
    result.set(pid, { ...defaults });
  }

  // Single ps call with a delimiter to separate fields reliably
  // Using tab-separated output for reliable parsing
  try {
    const output = execSync(
      `ps -p ${pidList} -o pid=,pcpu=,rss=,etime=,state=`,
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();

    for (const line of output.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 5) continue;
      const pid = parseInt(parts[0], 10);
      const entry = result.get(pid);
      if (!entry) continue;
      entry.cpuPercent = parseFloat(parts[1]) || 0;
      entry.memoryMB = Math.round((parseInt(parts[2], 10) || 0) / 1024);
      entry.uptime = parts[3];
      entry.status = parts[4].startsWith('T') ? 'suspended' : 'running';
    }
  } catch {
    // Ignore batch failure
  }

  // Fetch commands individually (can contain spaces so can't batch reliably)
  for (const pid of pids) {
    try {
      const command = execSync(`ps -p ${pid} -o command=`, { encoding: 'utf-8', timeout: 3000 }).trim();
      const entry = result.get(pid);
      if (entry) entry.command = command;
    } catch {
      // Process may have exited
    }
  }

  return result;
}

function getWorkingDirectory(pid: number): string {
  try {
    const output = execSync(`lsof -p ${pid} -Fn 2>/dev/null | grep '^n/' | head -1`, {
      encoding: 'utf-8',
      timeout: 3000,
    }).trim();
    // Output format: n/path/to/cwd
    if (output.startsWith('n')) return output.slice(1);
  } catch {
    // Fallback: try procfs-style approach via /proc or pwdx
    try {
      const output = execSync(`lsof -p ${pid} -a -d cwd -Fn 2>/dev/null | grep '^n'`, {
        encoding: 'utf-8',
        timeout: 3000,
      }).trim();
      if (output.startsWith('n')) return output.slice(1);
    } catch {
      // Ignore
    }
  }
  return '';
}

export function discoverProcesses(): PortProcess[] {
  const config = readConfig();
  const dashboardPort = config.settings.dashboardPort;

  let lsofOutput: string;
  try {
    lsofOutput = execSync('lsof -iTCP -sTCP:LISTEN -nP 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 10000,
    });
  } catch {
    return [];
  }

  const entries = parseLsofOutput(lsofOutput);

  // Group by port — pick parent PID (lowest PID per port for worker grouping)
  const portMap = new Map<number, { primary: LsofEntry; count: number }>();
  for (const entry of entries) {
    const existing = portMap.get(entry.port);
    if (!existing) {
      portMap.set(entry.port, { primary: entry, count: 1 });
    } else {
      existing.count++;
      // Keep the lowest PID as the parent
      if (entry.pid < existing.primary.pid) {
        existing.primary = entry;
      }
    }
  }

  const processes: PortProcess[] = [];

  // Batch fetch details for all unique PIDs
  const uniquePids = Array.from(new Set([...portMap.values()].map((v) => v.primary.pid)));
  const detailsMap = getBatchProcessDetails(uniquePids);

  for (const [port, { primary, count }] of portMap) {
    const details = detailsMap.get(primary.pid) ?? { command: '', cpuPercent: 0, memoryMB: 0, startTime: '', uptime: '', status: 'running' as const };
    const workingDirectory = getWorkingDirectory(primary.pid);
    const command = details.command || primary.name;

    const type = classifyProcess(primary.name, command, workingDirectory);
    const isPortctlProcess = port === dashboardPort && /portctl|node/.test(primary.name);
    const isSysProcess = isSystemProcess(primary.name, command);

    // Look up tags from config
    const portTagKey = `port:${port}`;
    const tags = config.tags[portTagKey] ?? [];

    processes.push({
      pid: primary.pid,
      name: primary.name,
      command,
      port,
      protocol: 'TCP',
      workingDirectory,
      memoryMB: details.memoryMB,
      cpuPercent: details.cpuPercent,
      uptime: details.uptime,
      startTime: details.startTime,
      status: details.status,
      type: isSysProcess ? 'system' : type,
      workerCount: count,
      isPortctl: isPortctlProcess,
      isSystem: isSysProcess,
      tags,
      hasLogs: false, // Will be updated by logger
    });
  }

  return processes;
}

// Polling state
let currentProcesses: PortProcess[] = [];
let pollInterval: ReturnType<typeof setInterval> | null = null;
let consecutiveFailures = 0;

export function getCurrentProcesses(): PortProcess[] {
  return currentProcesses;
}

export function startPolling(onUpdate?: (processes: PortProcess[]) => void): void {
  const config = readConfig();
  const interval = config.settings.pollingInterval;

  // Initial discovery
  currentProcesses = discoverProcesses();
  onUpdate?.(currentProcesses);

  pollInterval = setInterval(() => {
    try {
      currentProcesses = discoverProcesses();
      consecutiveFailures = 0;
      onUpdate?.(currentProcesses);
    } catch {
      consecutiveFailures++;
      if (consecutiveFailures >= 3) {
        console.error('Process discovery failed 3 consecutive times');
      }
    }
  }, interval);
}

export function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

export function getConsecutiveFailures(): number {
  return consecutiveFailures;
}
