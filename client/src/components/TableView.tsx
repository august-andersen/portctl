import React, { useState } from 'react';
import type { PortProcess } from '@shared/types';

type SortKey = 'port' | 'name' | 'pid' | 'status' | 'uptime' | 'cpuPercent' | 'memoryMB';
type SortDir = 'asc' | 'desc';

interface TableViewProps {
  processes: PortProcess[];
  onKill: (pid: number) => void;
  onSuspend: (pid: number) => void;
  onResume: (pid: number) => void;
  onMovePort: (pid: number, port: number) => void;
  onOpen: (port: number) => void;
  onViewLogs: (pid: number) => void;
}

export default function TableView({
  processes,
  onKill,
  onSuspend,
  onResume,
  onMovePort,
  onOpen,
  onViewLogs,
}: TableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('port');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...processes].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul;
    return String(av).localeCompare(String(bv)) * mul;
  });

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="text-left text-xs font-medium text-surface-200/50 px-3 py-2 cursor-pointer hover:text-surface-200 select-none"
      onClick={() => handleSort(field)}
    >
      {label} {sortKey === field ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
    </th>
  );

  const statusColors: Record<string, string> = {
    running: 'text-emerald-400',
    suspended: 'text-yellow-400',
    stopped: 'text-gray-400',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-surface-700">
          <tr>
            <SortHeader label="Port" field="port" />
            <SortHeader label="Process" field="name" />
            <SortHeader label="PID" field="pid" />
            <SortHeader label="Status" field="status" />
            <SortHeader label="Uptime" field="uptime" />
            <SortHeader label="CPU" field="cpuPercent" />
            <SortHeader label="Memory" field="memoryMB" />
            <th className="text-left text-xs font-medium text-surface-200/50 px-3 py-2">Tags</th>
            <th className="text-left text-xs font-medium text-surface-200/50 px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((proc) => (
            <tr
              key={proc.pid}
              className="border-b border-surface-700/50 hover:bg-surface-800/50 transition"
            >
              <td className="px-3 py-2 text-sm font-mono text-blue-400">:{proc.port}</td>
              <td className="px-3 py-2 text-sm text-surface-200 truncate max-w-[200px]" title={proc.name}>
                {proc.name}
                {proc.isPortctl && <span className="ml-1 text-xs text-blue-400">[portctl]</span>}
                {proc.isSystem && <span className="ml-1 text-xs text-yellow-400">[sys]</span>}
              </td>
              <td className="px-3 py-2 text-xs text-surface-200/50 font-mono">{proc.pid}</td>
              <td className={`px-3 py-2 text-xs ${statusColors[proc.status]}`}>{proc.status}</td>
              <td className="px-3 py-2 text-xs text-surface-200/50">{proc.uptime}</td>
              <td className="px-3 py-2 text-xs text-surface-200/50">{proc.cpuPercent.toFixed(1)}%</td>
              <td className="px-3 py-2 text-xs text-surface-200/50">{proc.memoryMB}MB</td>
              <td className="px-3 py-2">
                <div className="flex gap-1 flex-wrap">
                  {proc.tags.map((tag) => (
                    <span key={tag} className="bg-surface-700 text-surface-200/60 text-xs px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  {!proc.isPortctl && (
                    <button
                      className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5"
                      onClick={() => onKill(proc.pid)}
                    >
                      Kill
                    </button>
                  )}
                  {!proc.isPortctl && proc.status === 'running' && (
                    <button
                      className="text-xs text-yellow-400 hover:text-yellow-300 px-1.5 py-0.5"
                      onClick={() => onSuspend(proc.pid)}
                    >
                      Suspend
                    </button>
                  )}
                  {proc.status === 'suspended' && (
                    <button
                      className="text-xs text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5"
                      onClick={() => onResume(proc.pid)}
                    >
                      Resume
                    </button>
                  )}
                  <button
                    className="text-xs text-blue-400 hover:text-blue-300 px-1.5 py-0.5"
                    onClick={() => onOpen(proc.port)}
                  >
                    Open
                  </button>
                  <button
                    className="text-xs text-surface-200/50 hover:text-surface-200 px-1.5 py-0.5"
                    onClick={() => onViewLogs(proc.pid)}
                  >
                    Logs
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
