import { useState, useEffect, useCallback, useRef } from 'react';
import type { PortProcess, PortctlConfig, Toast } from '@shared/types';

const API_BASE = '';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function useProcesses() {
  const [processes, setProcesses] = useState<PortProcess[]>([]);
  const [config, setConfig] = useState<PortctlConfig | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [discoveryFailures, setDiscoveryFailures] = useState(0);
  const [loading, setLoading] = useState(true);
  const actionInProgress = useRef<Set<number>>(new Set());

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Poll processes and toasts
  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const [procData, toastData] = await Promise.all([
          apiFetch<{ processes: PortProcess[]; timestamp: number }>('/api/processes'),
          apiFetch<{ toasts: Toast[]; discoveryFailures: number }>('/api/toasts'),
        ]);

        if (!mounted) return;
        setProcesses(procData.processes);
        setDiscoveryFailures(toastData.discoveryFailures);

        for (const t of toastData.toasts) {
          addToast(t);
        }

        setLoading(false);
      } catch {
        if (mounted) setLoading(false);
      }
    };

    poll();
    const interval = setInterval(poll, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [addToast]);

  // Load config once
  useEffect(() => {
    apiFetch<PortctlConfig>('/api/config').then(setConfig).catch(() => {});
  }, []);

  const refreshConfig = useCallback(async () => {
    try {
      const c = await apiFetch<PortctlConfig>('/api/config');
      setConfig(c);
    } catch {
      // ignore
    }
  }, []);

  const isActionInProgress = useCallback((pid: number) => actionInProgress.current.has(pid), []);

  const withAction = useCallback(
    async (pid: number, fn: () => Promise<void>) => {
      if (actionInProgress.current.has(pid)) return;
      actionInProgress.current.add(pid);
      try {
        await fn();
      } finally {
        actionInProgress.current.delete(pid);
      }
    },
    []
  );

  // Actions
  const killProc = useCallback(
    async (pid: number) => {
      await withAction(pid, async () => {
        await apiFetch(`/api/processes/${pid}/kill`, { method: 'POST' });
        // Optimistic: remove from list
        setProcesses((prev) => prev.filter((p) => p.pid !== pid));
      });
    },
    [withAction]
  );

  const suspendProc = useCallback(
    async (pid: number) => {
      await withAction(pid, async () => {
        await apiFetch(`/api/processes/${pid}/suspend`, { method: 'POST' });
        setProcesses((prev) =>
          prev.map((p) => (p.pid === pid ? { ...p, status: 'suspended' as const } : p))
        );
      });
    },
    [withAction]
  );

  const resumeProc = useCallback(
    async (pid: number) => {
      await withAction(pid, async () => {
        await apiFetch(`/api/processes/${pid}/resume`, { method: 'POST' });
        setProcesses((prev) =>
          prev.map((p) => (p.pid === pid ? { ...p, status: 'running' as const } : p))
        );
      });
    },
    [withAction]
  );

  const moveProc = useCallback(
    async (pid: number, targetPort: number) => {
      await withAction(pid, async () => {
        await apiFetch(`/api/processes/${pid}/move`, {
          method: 'POST',
          body: JSON.stringify({ targetPort }),
        });
      });
    },
    [withAction]
  );

  const openProc = useCallback(async (port: number) => {
    await apiFetch(`/api/open/${port}`, { method: 'POST' });
  }, []);

  const getLogs = useCallback(async (pid: number) => {
    return apiFetch<{ pid: number; logs: Array<{ timestamp: number; stream: string; text: string }>; available: boolean; message?: string }>(
      `/api/processes/${pid}/logs`
    );
  }, []);

  // Config actions
  const updateSettings = useCallback(
    async (settings: Partial<PortctlConfig['settings']>) => {
      await apiFetch('/api/config/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      await refreshConfig();
    },
    [refreshConfig]
  );

  const addReservation = useCallback(
    async (reservation: PortctlConfig['reservations'][0]) => {
      await apiFetch('/api/config/reservations', {
        method: 'POST',
        body: JSON.stringify(reservation),
      });
      await refreshConfig();
    },
    [refreshConfig]
  );

  const removeReservation = useCallback(
    async (port: number) => {
      await apiFetch(`/api/config/reservations/${port}`, { method: 'DELETE' });
      await refreshConfig();
    },
    [refreshConfig]
  );

  const addBlockedPort = useCallback(
    async (port: number) => {
      await apiFetch('/api/config/blocked-ports', {
        method: 'POST',
        body: JSON.stringify({ port }),
      });
      await refreshConfig();
    },
    [refreshConfig]
  );

  const removeBlockedPort = useCallback(
    async (port: number) => {
      await apiFetch(`/api/config/blocked-ports/${port}`, { method: 'DELETE' });
      await refreshConfig();
    },
    [refreshConfig]
  );

  const togglePin = useCallback(
    async (port: number) => {
      const isPinned = config?.pinnedPorts.includes(port);
      if (isPinned) {
        await apiFetch(`/api/config/pinned-ports/${port}`, { method: 'DELETE' });
      } else {
        await apiFetch('/api/config/pinned-ports', {
          method: 'POST',
          body: JSON.stringify({ port }),
        });
      }
      await refreshConfig();
    },
    [config, refreshConfig]
  );

  const updateTags = useCallback(
    async (key: string, tags: string[]) => {
      await apiFetch(`/api/config/tags/${key}`, {
        method: 'POST',
        body: JSON.stringify({ tags }),
      });
      await refreshConfig();
    },
    [refreshConfig]
  );

  const updateCardOrder = useCallback(
    async (order: number[]) => {
      await apiFetch('/api/config/card-order', {
        method: 'PUT',
        body: JSON.stringify({ order }),
      });
      await refreshConfig();
    },
    [refreshConfig]
  );

  const updateRestartCommand = useCallback(
    async (key: string, command: string) => {
      await apiFetch(`/api/config/restart-command/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ command }),
      });
      await refreshConfig();
    },
    [refreshConfig]
  );

  const hideProcess = useCallback(
    async (name: string) => {
      await apiFetch('/api/config/hidden-processes', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      await refreshConfig();
    },
    [refreshConfig]
  );

  const unhideProcess = useCallback(
    async (name: string) => {
      await apiFetch(`/api/config/hidden-processes/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      await refreshConfig();
    },
    [refreshConfig]
  );

  return {
    processes,
    config,
    toasts,
    discoveryFailures,
    loading,
    isActionInProgress,
    addToast,
    removeToast,
    refreshConfig,
    killProc,
    suspendProc,
    resumeProc,
    moveProc,
    openProc,
    getLogs,
    updateSettings,
    addReservation,
    removeReservation,
    addBlockedPort,
    removeBlockedPort,
    togglePin,
    updateTags,
    updateCardOrder,
    updateRestartCommand,
    hideProcess,
    unhideProcess,
  };
}
