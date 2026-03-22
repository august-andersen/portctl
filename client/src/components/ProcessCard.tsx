import React, { useState, useRef } from 'react';
import type { PortProcess } from '@shared/types';

interface ProcessCardProps {
  process: PortProcess;
  isPinned: boolean;
  onKill: (pid: number) => void;
  onSuspend: (pid: number) => void;
  onResume: (pid: number) => void;
  onMovePort: (pid: number, port: number) => void;
  onOpen: (port: number) => void;
  onTogglePin: (port: number) => void;
  onViewLogs: (pid: number) => void;
  onReserve: (process: PortProcess) => void;
  onEditTags: (process: PortProcess) => void;
  onDragStart: (port: number) => void;
  onDragOver: (port: number) => void;
  onDragEnd: () => void;
  actionInProgress: boolean;
  cardClickBehavior: string;
}

const statusColors: Record<string, string> = {
  running: 'bg-emerald-500',
  suspended: 'bg-yellow-500',
  stopped: 'bg-gray-500',
};

const typeLabels: Record<string, { label: string; color: string }> = {
  web: { label: 'Web', color: 'bg-blue-500/20 text-blue-400' },
  api: { label: 'API', color: 'bg-purple-500/20 text-purple-400' },
  database: { label: 'DB', color: 'bg-orange-500/20 text-orange-400' },
  system: { label: 'System', color: 'bg-gray-500/20 text-gray-400' },
};

export default function ProcessCard({
  process: proc,
  isPinned,
  onKill,
  onSuspend,
  onResume,
  onMovePort,
  onOpen,
  onTogglePin,
  onViewLogs,
  onReserve,
  onEditTags,
  onDragStart,
  onDragOver,
  onDragEnd,
  actionInProgress,
  cardClickBehavior,
}: ProcessCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showKillConfirm, setShowKillConfirm] = useState(false);
  const [showMoveInput, setShowMoveInput] = useState(false);
  const [movePort, setMovePort] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const killRef = useRef<HTMLDivElement>(null);

  const typeInfo = typeLabels[proc.type] ?? typeLabels.system;

  const handleCardClick = () => {
    if (cardClickBehavior === 'openBrowser' && (proc.type === 'web' || proc.type === 'api')) {
      onOpen(proc.port);
    } else {
      onViewLogs(proc.pid);
    }
  };

  const handleMoveSubmit = () => {
    const port = parseInt(movePort, 10);
    if (port >= 1 && port <= 65535) {
      onMovePort(proc.pid, port);
      setShowMoveInput(false);
      setMovePort('');
    }
  };

  return (
    <div
      draggable
      onDragStart={() => onDragStart(proc.port)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(proc.port);
      }}
      onDragEnd={onDragEnd}
      className="bg-surface-800 dark:bg-surface-800 light:bg-white border border-surface-700 dark:border-surface-700 rounded-xl p-4 hover:border-surface-200/30 transition-all relative group cursor-grab active:cursor-grabbing"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-surface-200/40 cursor-grab">:::</span>
          <span className="text-lg font-mono font-bold text-blue-400">:{proc.port}</span>
          <span className={`${typeInfo.color} text-xs px-1.5 py-0.5 rounded font-medium`}>
            {typeInfo.label}
          </span>
          {proc.isPortctl && (
            <span className="bg-blue-500/20 text-blue-300 text-xs px-1.5 py-0.5 rounded">portctl</span>
          )}
          {proc.isSystem && (
            <span className="bg-yellow-500/20 text-yellow-300 text-xs px-1.5 py-0.5 rounded">System</span>
          )}
          {isPinned && (
            <span className="text-yellow-400 text-xs" title="Pinned">&#128204;</span>
          )}
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${statusColors[proc.status]}`} title={proc.status} />
      </div>

      {/* Process info */}
      <div className="mb-2 cursor-pointer" onClick={handleCardClick}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-surface-200 truncate max-w-[200px]" title={proc.name}>
            {proc.name}
          </span>
          <span className="text-xs text-surface-200/50 font-mono">PID {proc.pid}</span>
        </div>
        <div className="text-xs text-surface-200/40 mt-0.5">
          {proc.uptime && <span>up {proc.uptime}</span>}
          {proc.workerCount > 1 && (
            <span className="ml-2 text-surface-200/30">{proc.workerCount} workers</span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="flex gap-4 text-xs text-surface-200/50 mb-3">
        <span>CPU: {proc.cpuPercent.toFixed(1)}%</span>
        <span>MEM: {proc.memoryMB}MB</span>
      </div>

      {/* Tags */}
      {proc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {proc.tags.map((tag) => (
            <span
              key={tag}
              className="bg-surface-700 text-surface-200/70 text-xs px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!proc.isPortctl && !proc.isSystem && (
          <div className="relative">
            <button
              className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
              onClick={() => setShowKillConfirm(true)}
              disabled={actionInProgress}
            >
              Kill
            </button>
            {showKillConfirm && (
              <div ref={killRef} className="absolute bottom-full left-0 mb-1 bg-surface-900 border border-surface-700 rounded-lg p-3 shadow-xl z-20 min-w-[180px]">
                <p className="text-xs text-surface-200 mb-2">Kill {proc.name}?</p>
                {proc.isSystem && (
                  <p className="text-xs text-yellow-400 mb-2">This is a system process. Killing it may affect system functionality.</p>
                )}
                <div className="flex gap-2">
                  <button
                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                    onClick={() => {
                      onKill(proc.pid);
                      setShowKillConfirm(false);
                    }}
                  >
                    Kill
                  </button>
                  <button
                    className="text-xs bg-surface-700 hover:bg-surface-200/20 text-surface-200 px-3 py-1 rounded"
                    onClick={() => setShowKillConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!proc.isPortctl && (
          <div className="relative">
            <button
              className="text-xs bg-surface-700 text-surface-200/70 hover:bg-surface-200/20 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
              onClick={() => setShowMoveInput(!showMoveInput)}
              disabled={actionInProgress}
            >
              Switch Port
            </button>
            {showMoveInput && (
              <div className="absolute bottom-full left-0 mb-1 bg-surface-900 border border-surface-700 rounded-lg p-3 shadow-xl z-20">
                <p className="text-xs text-surface-200/70 mb-2">Move to port:</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={movePort}
                    onChange={(e) => setMovePort(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMoveSubmit()}
                    className="w-24 bg-surface-800 border border-surface-700 text-surface-200 text-xs px-2 py-1 rounded"
                    placeholder="8080"
                    min={1}
                    max={65535}
                    autoFocus
                  />
                  <button
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                    onClick={handleMoveSubmit}
                  >
                    Move
                  </button>
                  <button
                    className="text-xs bg-surface-700 text-surface-200 px-2 py-1 rounded"
                    onClick={() => setShowMoveInput(false)}
                  >
                    &times;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          className={`text-xs px-2.5 py-1.5 rounded-lg transition ${
            isPinned
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-surface-700 text-surface-200/70 hover:bg-surface-200/20'
          }`}
          onClick={() => onTogglePin(proc.port)}
        >
          {isPinned ? 'Unpin' : 'Pin'}
        </button>

        {/* Three-dot menu */}
        <div className="relative ml-auto">
          <button
            className="text-surface-200/50 hover:text-surface-200 text-lg px-1"
            onClick={() => setShowMenu(!showMenu)}
          >
            &#x22EF;
          </button>
          {showMenu && (
            <div
              ref={menuRef}
              className="absolute right-0 bottom-full mb-1 bg-surface-900 border border-surface-700 rounded-lg shadow-xl z-30 min-w-[180px] py-1"
            >
              <MenuButton onClick={() => { onViewLogs(proc.pid); setShowMenu(false); }}>
                View Logs
              </MenuButton>
              <MenuButton onClick={() => { onOpen(proc.port); setShowMenu(false); }}>
                Open in Browser
              </MenuButton>
              {!proc.isPortctl && proc.status === 'running' && (
                <MenuButton onClick={() => { onSuspend(proc.pid); setShowMenu(false); }}>
                  Suspend
                </MenuButton>
              )}
              {proc.status === 'suspended' && (
                <MenuButton onClick={() => { onResume(proc.pid); setShowMenu(false); }}>
                  Resume
                </MenuButton>
              )}
              <MenuButton onClick={() => { onReserve(proc); setShowMenu(false); }}>
                Reserve Port
              </MenuButton>
              <MenuButton onClick={() => { onEditTags(proc); setShowMenu(false); }}>
                Edit Tags
              </MenuButton>
              <div className="border-t border-surface-700 my-1" />
              <MenuButton onClick={() => { navigator.clipboard.writeText(String(proc.pid)); setShowMenu(false); }}>
                Copy PID
              </MenuButton>
              <MenuButton onClick={() => { navigator.clipboard.writeText(proc.command); setShowMenu(false); }}>
                Copy Command
              </MenuButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="w-full text-left text-xs text-surface-200/70 hover:bg-surface-800 hover:text-surface-200 px-3 py-1.5 transition"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// Empty/Pinned card for ports with no active process
export function EmptyPortCard({
  port,
  reservation,
  onUnpin,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  port: number;
  reservation?: { label: string; restartTemplate: string | null };
  onUnpin: (port: number) => void;
  onDragStart: (port: number) => void;
  onDragOver: (port: number) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(port)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(port);
      }}
      onDragEnd={onDragEnd}
      className="bg-surface-800/50 border border-surface-700/50 rounded-xl p-4 opacity-60"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-surface-200/40">:::</span>
          <span className="text-lg font-mono font-bold text-surface-200/40">:{port}</span>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
      </div>
      <div className="text-xs text-surface-200/30 mb-3">
        {reservation ? `Reserved for: ${reservation.label}` : 'No process running'}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="text-xs bg-surface-700/50 text-surface-200/50 hover:bg-surface-200/20 px-2.5 py-1.5 rounded-lg transition"
          onClick={() => onUnpin(port)}
        >
          Unpin
        </button>
      </div>
    </div>
  );
}
