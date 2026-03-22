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

  const stdoutCount = filteredLogs.filter((l) => l.stream === 'stdout').length;
  const stderrCount = filteredLogs.filter((l) => l.stream === 'stderr').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <div
        className="bg-surface-900 border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '72vw', maxWidth: '920px', height: '72vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-surface-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-surface-100 text-sm font-sans">{proc.name}</span>
            </div>
            <span className="text-sm text-indigo-300 font-mono">:{proc.port}</span>
            <span className="text-[11px] text-surface-500 font-mono">PID {proc.pid}</span>
            {stderrCount > 0 && (
              <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md font-mono border border-red-500/20">
                {stderrCount} errors
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-surface-500 cursor-pointer hover:text-surface-300 transition select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded accent-indigo-500"
              />
              Auto-scroll
            </label>
            <button
              className="text-[11px] font-mono text-surface-500 hover:text-surface-200 bg-surface-800 hover:bg-surface-700 px-2.5 py-1 rounded-lg transition border border-white/[0.06]"
              onClick={() => setLogs([])}
            >
              Clear
            </button>
            <button
              className="text-surface-500 hover:text-surface-200 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition text-lg"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-5 py-2 border-b border-white/[0.04] bg-surface-950/20 shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter logs…"
            className="w-full bg-transparent text-surface-300 text-[11px] font-mono focus:outline-none placeholder:text-surface-600"
          />
        </div>

        {/* Log content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-5 log-viewer bg-surface-950/30"
        >
          {!available && message && (
            <div className="text-surface-500 text-center py-12 italic font-sans text-sm">{message}</div>
          )}

          {filteredLogs.length === 0 && available && (
            <div className="text-surface-600 text-center py-12 font-sans text-sm">No output yet</div>
          )}

          {filteredLogs.map((log, i) => (
            <div
              key={i}
              className={`flex gap-3 leading-relaxed ${log.stream === 'stderr' ? 'text-red-400' : 'text-surface-300'}`}
            >
              <span className="text-surface-700 shrink-0 select-none text-[10px] pt-px tabular-nums w-18">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="flex-1 break-all">{log.text}</span>
            </div>
          ))}

          <div ref={logEndRef} />
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-white/[0.04] bg-surface-950/30 shrink-0">
          <span className="text-[10px] text-surface-600 font-mono">
            {filteredLogs.length} lines
            {search && ` · filtered from ${logs.length}`}
            {stderrCount > 0 && ` · ${stderrCount} stderr`}
          </span>
        </div>
      </div>
    </div>
  );
}
