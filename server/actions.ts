import { execSync, spawn, ChildProcess } from 'child_process';
import { getCurrentProcesses } from './discovery.js';
import { logCapture } from './logger.js';

// ── Port Argument Detection ──

interface PortDetection {
  detected: boolean;
  newCommand: string;
  method: string;
}

// Common port flag patterns, ordered by specificity
const PORT_PATTERNS: Array<{
  regex: RegExp;
  replace: (match: string, newPort: number) => string;
  name: string;
}> = [
  // --port=3000 or --port 3000
  {
    regex: /(--port[= ])(\d+)/,
    replace: (m, p) => m.replace(/(--port[= ])\d+/, `$1${p}`),
    name: '--port flag',
  },
  // -p 3000 or -p=3000
  {
    regex: /(-p[= ])(\d+)/,
    replace: (m, p) => m.replace(/(-p[= ])\d+/, `$1${p}`),
    name: '-p flag',
  },
  // --listen 3000
  {
    regex: /(--listen[= ])(\d+)/,
    replace: (m, p) => m.replace(/(--listen[= ])\d+/, `$1${p}`),
    name: '--listen flag',
  },
  // PORT=3000 at start of command (env var)
  {
    regex: /\bPORT=(\d+)/,
    replace: (m, p) => m.replace(/\bPORT=\d+/, `PORT=${p}`),
    name: 'PORT env var',
  },
  // Django: runserver 0.0.0.0:3000 or runserver :3000 or runserver 3000
  {
    regex: /(runserver\s+(?:[\d.]+:)?)(\d+)/,
    replace: (m, p) => m.replace(/(runserver\s+(?:[\d.]+:)?)\d+/, `$1${p}`),
    name: 'Django runserver',
  },
  // Generic :PORT in URLs like http://0.0.0.0:3000
  {
    regex: /((?:localhost|127\.0\.0\.1|0\.0\.0\.0):)(\d+)/,
    replace: (m, p) => m.replace(/((?:localhost|127\.0\.0\.1|0\.0\.0\.0):)\d+/, `$1${p}`),
    name: 'host:port pattern',
  },
];

export function detectPortInCommand(command: string, currentPort: number): PortDetection {
  // Try each pattern
  for (const pattern of PORT_PATTERNS) {
    const match = command.match(pattern.regex);
    if (match && parseInt(match[2] ?? match[1], 10) === currentPort) {
      return {
        detected: true,
        newCommand: command, // Will be replaced with actual port at move time
        method: pattern.name,
      };
    }
  }

  return { detected: false, newCommand: command, method: 'none' };
}

export function replacePortInCommand(command: string, currentPort: number, newPort: number): string {
  for (const pattern of PORT_PATTERNS) {
    const match = command.match(pattern.regex);
    if (match) {
      const portValue = parseInt(match[2] ?? match[1], 10);
      if (portValue === currentPort) {
        return pattern.replace(command, newPort);
      }
    }
  }

  // Last resort: replace all occurrences of the port number as standalone token
  return command.replace(new RegExp(`\\b${currentPort}\\b`, 'g'), String(newPort));
}

// ── Process Actions ──

export async function killProcess(pid: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Send SIGTERM first
    process.kill(pid, 'SIGTERM');

    // Wait up to 3 seconds for graceful exit
    const start = Date.now();
    while (Date.now() - start < 3000) {
      try {
        process.kill(pid, 0); // Check if still alive
        await sleep(100);
      } catch {
        return { success: true }; // Process exited
      }
    }

    // Force kill
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already exited
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('EPERM')) {
      return { success: false, error: 'Permission denied. Try running portctl with sudo.' };
    }
    return { success: false, error: message };
  }
}

export function suspendProcess(pid: number): { success: boolean; error?: string } {
  try {
    process.kill(pid, 'SIGSTOP');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function resumeProcess(pid: number): { success: boolean; error?: string } {
  try {
    process.kill(pid, 'SIGCONT');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export interface MoveResult {
  success: boolean;
  error?: string;
  newPid?: number;
  method?: string;
}

export async function moveProcess(
  pid: number,
  currentPort: number,
  targetPort: number,
  customCommand?: string
): Promise<MoveResult> {
  // Get the process info
  const processes = getCurrentProcesses();
  const proc = processes.find((p) => p.pid === pid);
  if (!proc) {
    return { success: false, error: 'Process not found' };
  }

  let restartCommand: string;
  let workingDir = proc.workingDirectory || process.env.HOME || '/';

  if (customCommand) {
    // Use custom restart template with {{PORT}} replacement
    restartCommand = customCommand.replace(/\{\{PORT\}\}/g, String(targetPort));
  } else {
    // Auto-detect port in command
    const detection = detectPortInCommand(proc.command, currentPort);
    if (!detection.detected) {
      return {
        success: false,
        error: `Could not auto-detect port argument in command: ${proc.command}`,
        method: 'none',
      };
    }
    restartCommand = replacePortInCommand(proc.command, currentPort, targetPort);
  }

  // Kill the current process
  const killResult = await killProcess(pid);
  if (!killResult.success) {
    return { success: false, error: `Failed to kill process: ${killResult.error}` };
  }

  // Wait a moment for port to be freed
  await sleep(500);

  // Restart with new port
  try {
    const child = spawn('sh', ['-c', restartCommand], {
      cwd: workingDir,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    if (child.pid) {
      // Capture logs for the new process
      logCapture.captureProcess(child.pid, child);
      child.unref();

      return {
        success: true,
        newPid: child.pid,
        method: customCommand ? 'custom template' : 'auto-detected',
      };
    }

    return { success: false, error: 'Failed to start new process' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function openInBrowser(port: number): void {
  try {
    execSync(`open http://localhost:${port}`);
  } catch {
    // Ignore
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
