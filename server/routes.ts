import { Router, type Request, type Response } from 'express';
import { getCurrentProcesses, getConsecutiveFailures } from './discovery.js';
import { killProcess, suspendProcess, resumeProcess, moveProcess, openInBrowser } from './actions.js';
import { readConfig, updateConfig } from './config.js';
import { logCapture } from './logger.js';
import { checkReservations, executeMigrations, checkBlockedPorts } from './reservation.js';
import type {
  ApiProcessListResponse,
  ApiStatusResponse,
  ApiMoveRequest,
  ApiLogsResponse,
  PortctlConfig,
  Reservation,
  Toast,
} from '../shared/types.js';

const router = Router();

// ── Toast queue for the frontend to poll ──
const toastQueue: Toast[] = [];
let toastIdCounter = 0;

function pushToast(type: Toast['type'], message: string): void {
  toastQueue.push({ id: String(++toastIdCounter), type, message });
  // Keep max 50 toasts
  while (toastQueue.length > 50) toastQueue.shift();
}

// ── Process endpoints ──

router.get('/api/processes', (_req: Request, res: Response) => {
  const processes = getCurrentProcesses();
  // Update hasLogs flag
  for (const proc of processes) {
    proc.hasLogs = logCapture.hasLogs(proc.pid);
  }
  const response: ApiProcessListResponse = {
    processes,
    timestamp: Date.now(),
  };
  res.json(response);
});

router.post('/api/processes/:pid/kill', async (req: Request, res: Response) => {
  const pid = parseInt(req.params.pid, 10);
  if (isNaN(pid)) {
    res.status(400).json({ error: 'Invalid PID' });
    return;
  }

  // Check if this is portctl itself
  const processes = getCurrentProcesses();
  const proc = processes.find((p) => p.pid === pid);
  if (proc?.isPortctl) {
    res.status(403).json({ error: 'Cannot kill portctl daemon from the dashboard' });
    return;
  }

  const result = await killProcess(pid);
  if (result.success) {
    pushToast('success', `Killed ${proc?.name ?? `PID ${pid}`}`);
    res.json({ success: true });
  } else {
    pushToast('error', `Failed to kill ${proc?.name ?? `PID ${pid}`}: ${result.error}`);
    res.status(500).json({ error: result.error });
  }
});

router.post('/api/processes/:pid/suspend', (req: Request, res: Response) => {
  const pid = parseInt(req.params.pid, 10);
  if (isNaN(pid)) {
    res.status(400).json({ error: 'Invalid PID' });
    return;
  }

  const processes = getCurrentProcesses();
  const proc = processes.find((p) => p.pid === pid);
  if (proc?.isPortctl) {
    res.status(403).json({ error: 'Cannot suspend portctl daemon' });
    return;
  }

  const result = suspendProcess(pid);
  if (result.success) {
    pushToast('success', `Suspended ${proc?.name ?? `PID ${pid}`}`);
    res.json({ success: true });
  } else {
    res.status(500).json({ error: result.error });
  }
});

router.post('/api/processes/:pid/resume', (req: Request, res: Response) => {
  const pid = parseInt(req.params.pid, 10);
  if (isNaN(pid)) {
    res.status(400).json({ error: 'Invalid PID' });
    return;
  }

  const result = resumeProcess(pid);
  const proc = getCurrentProcesses().find((p) => p.pid === pid);
  if (result.success) {
    pushToast('success', `Resumed ${proc?.name ?? `PID ${pid}`}`);
    res.json({ success: true });
  } else {
    res.status(500).json({ error: result.error });
  }
});

router.post('/api/processes/:pid/move', async (req: Request, res: Response) => {
  const pid = parseInt(req.params.pid, 10);
  const { targetPort } = req.body as ApiMoveRequest;

  if (isNaN(pid) || !targetPort || targetPort < 1 || targetPort > 65535) {
    res.status(400).json({ error: 'Invalid PID or target port' });
    return;
  }

  const processes = getCurrentProcesses();
  const proc = processes.find((p) => p.pid === pid);
  if (!proc) {
    res.status(404).json({ error: 'Process not found' });
    return;
  }

  if (proc.isPortctl) {
    res.status(403).json({ error: 'Cannot move portctl daemon' });
    return;
  }

  // Check for custom restart command
  const config = readConfig();
  const customCmd =
    config.customRestartCommands[`port:${proc.port}`] ??
    config.reservations.find((r) => r.port === proc.port)?.restartTemplate ??
    undefined;

  const result = await moveProcess(pid, proc.port, targetPort, customCmd ?? undefined);
  if (result.success) {
    pushToast('success', `Moved ${proc.name} from port ${proc.port} to ${targetPort}`);
    res.json({ success: true, newPid: result.newPid, method: result.method });
  } else {
    pushToast('error', `Failed to move ${proc.name}: ${result.error}`);
    res.status(500).json({ error: result.error, method: result.method });
  }
});

router.post('/api/processes/:pid/open', (req: Request, res: Response) => {
  const pid = parseInt(req.params.pid, 10);
  const proc = getCurrentProcesses().find((p) => p.pid === pid);
  if (proc) {
    openInBrowser(proc.port);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Process not found' });
  }
});

router.get('/api/processes/:pid/logs', (req: Request, res: Response) => {
  const pid = parseInt(req.params.pid, 10);
  if (isNaN(pid)) {
    res.status(400).json({ error: 'Invalid PID' });
    return;
  }

  const logs = logCapture.getLogs(pid);
  const hasLogs = logCapture.hasLogs(pid);

  const response: ApiLogsResponse = {
    pid,
    logs,
    available: hasLogs,
    message: hasLogs ? undefined : 'Logs available from next restart managed by portctl',
  };
  res.json(response);
});

// ── Config endpoints ──

router.get('/api/config', (_req: Request, res: Response) => {
  res.json(readConfig());
});

router.put('/api/config/settings', (req: Request, res: Response) => {
  const settings = req.body;
  const updated = updateConfig((c) => ({
    ...c,
    settings: { ...c.settings, ...settings },
  }));
  res.json(updated.settings);
});

router.get('/api/config/reservations', (_req: Request, res: Response) => {
  res.json(readConfig().reservations);
});

router.post('/api/config/reservations', (req: Request, res: Response) => {
  const reservation = req.body as Reservation;
  if (!reservation.port || !reservation.matcher) {
    res.status(400).json({ error: 'Invalid reservation' });
    return;
  }

  const updated = updateConfig((c) => ({
    ...c,
    reservations: [...c.reservations.filter((r) => r.port !== reservation.port), reservation],
  }));
  pushToast('success', `Reserved port ${reservation.port} for ${reservation.label || reservation.matcher.value}`);
  res.json(updated.reservations);
});

router.delete('/api/config/reservations/:port', (req: Request, res: Response) => {
  const port = parseInt(req.params.port, 10);
  const updated = updateConfig((c) => ({
    ...c,
    reservations: c.reservations.filter((r) => r.port !== port),
  }));
  pushToast('info', `Removed reservation for port ${port}`);
  res.json(updated.reservations);
});

router.post('/api/config/blocked-ports', (req: Request, res: Response) => {
  const { port } = req.body as { port: number };
  if (!port || port < 1 || port > 65535) {
    res.status(400).json({ error: 'Invalid port' });
    return;
  }

  const updated = updateConfig((c) => ({
    ...c,
    blockedPorts: [...new Set([...c.blockedPorts, port])],
  }));
  pushToast('info', `Blocked port ${port}`);
  res.json(updated.blockedPorts);
});

router.delete('/api/config/blocked-ports/:port', (req: Request, res: Response) => {
  const port = parseInt(req.params.port, 10);
  const updated = updateConfig((c) => ({
    ...c,
    blockedPorts: c.blockedPorts.filter((p) => p !== port),
  }));
  pushToast('info', `Unblocked port ${port}`);
  res.json(updated.blockedPorts);
});

router.post('/api/config/pinned-ports', (req: Request, res: Response) => {
  const { port } = req.body as { port: number };
  if (!port || port < 1 || port > 65535) {
    res.status(400).json({ error: 'Invalid port' });
    return;
  }

  const updated = updateConfig((c) => ({
    ...c,
    pinnedPorts: [...new Set([...c.pinnedPorts, port])],
  }));
  res.json(updated.pinnedPorts);
});

router.delete('/api/config/pinned-ports/:port', (req: Request, res: Response) => {
  const port = parseInt(req.params.port, 10);
  const updated = updateConfig((c) => ({
    ...c,
    pinnedPorts: c.pinnedPorts.filter((p) => p !== port),
  }));
  res.json(updated.pinnedPorts);
});

router.post('/api/config/tags/:key', (req: Request, res: Response) => {
  const key = req.params.key;
  const { tags } = req.body as { tags: string[] };
  const updated = updateConfig((c) => ({
    ...c,
    tags: { ...c.tags, [key]: tags },
  }));
  res.json(updated.tags);
});

router.put('/api/config/card-order', (req: Request, res: Response) => {
  const { order } = req.body as { order: number[] };
  const updated = updateConfig((c) => ({
    ...c,
    cardOrder: order,
  }));
  res.json(updated.cardOrder);
});

router.put('/api/config/restart-command/:key', (req: Request, res: Response) => {
  const key = req.params.key;
  const { command } = req.body as { command: string };
  const updated = updateConfig((c) => ({
    ...c,
    customRestartCommands: { ...c.customRestartCommands, [key]: command },
  }));
  res.json({ success: true });
});

// ── Hidden processes ──

router.post('/api/config/hidden-processes', (req: Request, res: Response) => {
  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ error: 'Invalid process name' });
    return;
  }
  const updated = updateConfig((c) => ({
    ...c,
    hiddenProcesses: [...new Set([...c.hiddenProcesses, name])],
  }));
  res.json(updated.hiddenProcesses);
});

router.delete('/api/config/hidden-processes/:name', (req: Request, res: Response) => {
  const name = decodeURIComponent(req.params.name);
  const updated = updateConfig((c) => ({
    ...c,
    hiddenProcesses: c.hiddenProcesses.filter((n) => n !== name),
  }));
  res.json(updated.hiddenProcesses);
});

// ── Custom names ──

router.put('/api/config/custom-names/:key', (req: Request, res: Response) => {
  const key = req.params.key;
  const { name } = req.body as { name: string };
  if (!name || !name.trim()) {
    // Empty name = remove custom name
    const updated = updateConfig((c) => {
      const next = { ...c.customNames };
      delete next[key];
      return { ...c, customNames: next };
    });
    res.json(updated.customNames);
    return;
  }
  const updated = updateConfig((c) => ({
    ...c,
    customNames: { ...c.customNames, [key]: name.trim() },
  }));
  res.json(updated.customNames);
});

// ── Favicon proxy ──

router.get('/api/favicon/:port', async (req: Request, res: Response) => {
  const port = parseInt(req.params.port, 10);
  if (isNaN(port)) {
    res.status(400).end();
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`http://localhost:${port}/favicon.ico`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const contentType = response.headers.get('content-type') ?? 'image/x-icon';
      const buffer = Buffer.from(await response.arrayBuffer());
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=300');
      res.send(buffer);
      return;
    }
  } catch {
    // Try /favicon.png as fallback
    try {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 2000);

      const response2 = await fetch(`http://localhost:${port}/favicon.png`, {
        signal: controller2.signal,
      });
      clearTimeout(timeout2);

      if (response2.ok) {
        const contentType = response2.headers.get('content-type') ?? 'image/png';
        const buffer = Buffer.from(await response2.arrayBuffer());
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=300');
        res.send(buffer);
        return;
      }
    } catch {
      // ignore
    }
  }

  res.status(404).end();
});

// ── Status & Toasts ──

router.get('/api/status', (_req: Request, res: Response) => {
  const config = readConfig();
  const response: ApiStatusResponse = {
    running: true,
    pid: process.pid,
    uptime: process.uptime(),
    dashboardUrl: `http://127.0.0.1:${config.settings.dashboardPort}`,
    version: '1.0.0',
  };
  res.json(response);
});

router.get('/api/toasts', (_req: Request, res: Response) => {
  const toasts = [...toastQueue];
  toastQueue.length = 0;
  res.json({ toasts, discoveryFailures: getConsecutiveFailures() });
});

// ── Open port in browser ──

router.post('/api/open/:port', (req: Request, res: Response) => {
  const port = parseInt(req.params.port, 10);
  if (isNaN(port)) {
    res.status(400).json({ error: 'Invalid port' });
    return;
  }
  openInBrowser(port);
  res.json({ success: true });
});

export { router, pushToast };
