import type { PortProcess, ProcessGroup } from '@shared/types';

/**
 * Extract a human-readable project/site name from a process.
 * Uses working directory to find the project folder name.
 */
function extractSiteName(proc: PortProcess): string {
  // Use working directory — find the last meaningful path segment
  if (proc.workingDirectory && proc.workingDirectory !== '/') {
    const parts = proc.workingDirectory.split('/').filter(Boolean);
    // Walk backwards, skip generic dirs
    const skip = new Set([
      'Users', 'home', 'var', 'tmp', 'opt', 'usr', 'src', 'app',
      'Desktop', 'Documents', 'Downloads', 'github', 'projects',
      'repos', 'code', 'dev', 'work', 'sites',
    ]);
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (!skip.has(part) && !part.startsWith('.') && part.length > 1) {
        return part;
      }
    }
  }

  // Try to extract from command — look for project paths
  const cmdPathMatch = proc.command.match(/\/([^/\s]+)\/(?:node_modules|\.bin|server|index|app|manage)/);
  if (cmdPathMatch && cmdPathMatch[1].length > 2) {
    return cmdPathMatch[1];
  }

  return proc.name;
}

/**
 * Group processes by PID to deduplicate same-process-multi-port.
 * Different PIDs stay as separate cards even if same binary name.
 */
export function groupProcesses(processes: PortProcess[]): ProcessGroup[] {
  // Group by PID — same process listening on multiple ports becomes one card
  const pidGroups = new Map<number, PortProcess[]>();

  for (const proc of processes) {
    const existing = pidGroups.get(proc.pid);
    if (existing) {
      existing.push(proc);
    } else {
      pidGroups.set(proc.pid, [proc]);
    }
  }

  const result: ProcessGroup[] = [];

  for (const [pid, procs] of pidGroups) {
    procs.sort((a, b) => a.port - b.port);

    const primary = procs[0];
    const isWeb = primary.type === 'web' || primary.type === 'api';
    const ports = [...new Set(procs.map((p) => p.port))];
    const totalCpu = procs.reduce((sum, p) => sum + p.cpuPercent, 0);
    const totalMemoryMB = procs.reduce((sum, p) => sum + p.memoryMB, 0);
    const allTags = [...new Set(procs.flatMap((p) => p.tags))];

    const longestUptime = procs.reduce((longest, p) => {
      if (!longest) return p.uptime;
      if (!p.uptime) return longest;
      return p.uptime.length > longest.length ? p.uptime : longest;
    }, '');

    const displayName = extractSiteName(primary);

    // Favicon for web/api processes
    const faviconUrl = (isWeb || primary.workingDirectory !== '/') && ports.length > 0
      ? `/api/favicon/${ports[0]}`
      : null;

    result.push({
      displayName,
      ports,
      primaryPid: pid,
      processes: procs,
      totalCpu,
      totalMemoryMB,
      type: primary.type,
      status: primary.status,
      isSystem: primary.isSystem,
      isPortctl: primary.isPortctl,
      tags: allTags,
      uptime: longestUptime,
      faviconUrl,
      hasLogs: procs.some((p) => p.hasLogs),
    });
  }

  return result;
}
