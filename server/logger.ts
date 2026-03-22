import type { ChildProcess } from 'child_process';
import type { LogEntry } from '../shared/types.js';
import { readConfig } from './config.js';

class LogCapture {
  private logs = new Map<number, LogEntry[]>();
  private maxLines: number;

  constructor() {
    this.maxLines = readConfig().settings.logBufferSize;
  }

  captureProcess(pid: number, child: ChildProcess): void {
    if (!this.logs.has(pid)) {
      this.logs.set(pid, []);
    }

    const addLog = (stream: 'stdout' | 'stderr', data: Buffer) => {
      const entries = this.logs.get(pid);
      if (!entries) return;

      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.length === 0) continue;
        entries.push({
          timestamp: Date.now(),
          stream,
          text: line,
        });
      }

      // Trim to max buffer
      while (entries.length > this.maxLines) {
        entries.shift();
      }
    };

    child.stdout?.on('data', (data: Buffer) => addLog('stdout', data));
    child.stderr?.on('data', (data: Buffer) => addLog('stderr', data));

    child.on('exit', () => {
      // Keep logs for a bit after process exits
      setTimeout(() => {
        // Only clean up if no new logs have been added (process truly gone)
        const entries = this.logs.get(pid);
        if (entries && entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          if (Date.now() - lastEntry.timestamp > 30000) {
            this.logs.delete(pid);
          }
        }
      }, 60000);
    });
  }

  getLogs(pid: number): LogEntry[] {
    return this.logs.get(pid) ?? [];
  }

  hasLogs(pid: number): boolean {
    const entries = this.logs.get(pid);
    return entries !== undefined && entries.length > 0;
  }

  clearLogs(pid: number): void {
    this.logs.delete(pid);
  }

  getTrackedPids(): number[] {
    return Array.from(this.logs.keys());
  }

  cleanupStaleProcesses(activePids: Set<number>): void {
    for (const pid of this.logs.keys()) {
      if (!activePids.has(pid)) {
        // Keep logs for recently exited processes (60s grace period)
        const entries = this.logs.get(pid);
        if (entries && entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          if (Date.now() - lastEntry.timestamp > 60000) {
            this.logs.delete(pid);
          }
        }
      }
    }
  }
}

export const logCapture = new LogCapture();
