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

const statusChip: Record<string, { cls: string; label: string }> = {
  running:   { cls: 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20', label: 'running' },
  suspended: { cls: 'bg-amber-500/12  text-amber-400  border border-amber-500/20',  label: 'paused'  },
  stopped:   { cls: 'bg-neutral-500/12 text-neutral-400 border border-neutral-500/20', label: 'stopped' },
};

const UpArrow = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
    <path d="M4.5 1.5 8 6.5H1L4.5 1.5z" />
  </svg>
);
const DownArrow = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
    <path d="M4.5 7.5 1 2.5h7L4.5 7.5z" />
  </svg>
);

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
      className="text-left px-4 py-2.5 cursor-pointer select-none group"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-surface-500 uppercase tracking-wider group-hover:text-surface-300 transition-colors">
        {label}
        <span className={`transition-opacity ${sortKey === field ? 'opacity-100 text-indigo-400' : 'opacity-0 group-hover:opacity-40'}`}>
          {sortKey === field ? (sortDir === 'asc' ? <UpArrow /> : <DownArrow />) : <DownArrow />}
        </span>
      </span>
    </th>
  );

  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden bg-surface-800/40">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06] bg-surface-900/40">
              <SortHeader label="Port" field="port" />
              <SortHeader label="Process" field="name" />
              <SortHeader label="PID" field="pid" />
              <SortHeader label="Status" field="status" />
              <SortHeader label="Uptime" field="uptime" />
              <SortHeader label="CPU" field="cpuPercent" />
              <SortHeader label="Memory" field="memoryMB" />
              <th className="text-left px-4 py-2.5">
                <span className="text-[11px] font-medium text-surface-500 uppercase tracking-wider">Tags</span>
              </th>
              <th className="text-left px-4 py-2.5">
                <span className="text-[11px] font-medium text-surface-500 uppercase tracking-wider">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {sorted.map((proc, i) => {
              const chip = statusChip[proc.status] ?? statusChip.stopped;
              return (
                <tr
                  key={proc.pid}
                  className={`hover:bg-white/[0.025] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                >
                  <td className="px-4 py-2.5">
                    <button
                      className="font-mono font-bold text-indigo-300 hover:text-indigo-100 transition-colors text-sm"
                      onClick={() => onOpen(proc.port)}
                      title={`Open localhost:${proc.port}`}
                    >
                      :{proc.port}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-surface-200 truncate font-sans font-medium" title={proc.name}>
                        {proc.name}
                      </span>
                      {proc.isPortctl && (
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded font-mono shrink-0">
                          portctl
                        </span>
                      )}
                      {proc.isSystem && (
                        <span className="text-[10px] text-neutral-400 bg-neutral-500/10 px-1 py-0.5 rounded font-mono shrink-0">
                          sys
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[11px] text-surface-500 font-mono">{proc.pid}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${chip.cls}`}>
                      {chip.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[11px] text-surface-500 font-mono">{proc.uptime}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[11px] text-surface-500 font-mono">{proc.cpuPercent.toFixed(1)}%</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[11px] text-surface-500 font-mono">{proc.memoryMB}MB</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {proc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-surface-700/60 text-surface-400 text-[10px] px-1.5 py-0.5 rounded-full font-mono border border-white/[0.04]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-0.5 items-center">
                      {!proc.isPortctl && (
                        <ActionBtn className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10" onClick={() => onKill(proc.pid)}>
                          Kill
                        </ActionBtn>
                      )}
                      {!proc.isPortctl && proc.status === 'running' && (
                        <ActionBtn className="text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10" onClick={() => onSuspend(proc.pid)}>
                          Pause
                        </ActionBtn>
                      )}
                      {proc.status === 'suspended' && (
                        <ActionBtn className="text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/10" onClick={() => onResume(proc.pid)}>
                          Resume
                        </ActionBtn>
                      )}
                      <ActionBtn className="text-indigo-400/70 hover:text-indigo-300 hover:bg-indigo-500/10" onClick={() => onOpen(proc.port)}>
                        Open
                      </ActionBtn>
                      <ActionBtn className="text-surface-500 hover:text-surface-200 hover:bg-surface-700/60" onClick={() => onViewLogs(proc.pid)}>
                        Logs
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-surface-600 text-sm font-sans">No processes</p>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={`text-[11px] font-mono px-2 py-1 rounded-md transition ${className ?? ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
