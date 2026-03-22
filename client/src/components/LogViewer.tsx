import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PortProcess } from '@shared/types';

interface LogViewerProps {
  process: PortProcess;
  getLogs: (pid: number) => Promise<{
    pid: number;
    logs: Array<{ timestamp: number; stream: string; text: string }>;
    available: boolean;
    message?: string;
  }>;
  onClose: () => void;
}

export default function LogViewer({ process: proc, getLogs, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<Array<{ timestamp: number; stream: string; text: string }>>([]);
  const [available, setAvailable] = useState(true);
  const [message, setMessage] = useState<string>();
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await getLogs(proc.pid);
      setLogs(data.logs);
      setAvailable(data.available);
      setMessage(data.message);
    } catch {
      // ignore
    }
  }, [getLogs, proc.pid]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    if (autoScroll) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filteredLogs = search
    ? logs.filter((l) => l.text.toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl flex flex-col" style={{ width: '70vw', maxWidth: '900px', height: '70vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
          <div className="flex items-center gap-3">
            <span className="font-medium text-surface-200">{proc.name}</span>
            <span className="text-sm text-surface-200/50 font-mono">:{proc.port}</span>
            <span className="text-xs text-surface-200/30">PID {proc.pid}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-surface-200/50">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
            <button
              className="text-xs bg-surface-800 text-surface-200/50 hover:text-surface-200 px-2 py-1 rounded"
              onClick={() => setLogs([])}
            >
              Clear
            </button>
            <button
              className="text-surface-200/50 hover:text-surface-200 text-xl px-2"
              onClick={onClose}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-surface-700">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full bg-surface-800 border border-surface-700 text-surface-200 text-xs px-3 py-1.5 rounded focus:outline-none focus:border-blue-500 placeholder:text-surface-200/30"
          />
        </div>

        {/* Log content */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 log-viewer">
          {!available && message && (
            <div className="text-surface-200/30 text-center py-8">{message}</div>
          )}
          {filteredLogs.map((log, i) => (
            <div
              key={i}
              className={`${log.stream === 'stderr' ? 'text-red-400' : 'text-surface-200/80'}`}
            >
              <span className="text-surface-200/20 mr-2 select-none">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              {log.text}
            </div>
          ))}
          {filteredLogs.length === 0 && available && (
            <div className="text-surface-200/30 text-center py-8">No log output yet</div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
