import React, { useState, useRef } from 'react';
import type { ProcessGroup } from '@shared/types';

interface ProcessCardProps {
  group: ProcessGroup;
  isPinned: boolean;
  onKill: (pid: number) => void;
  onSuspend: (pid: number) => void;
  onResume: (pid: number) => void;
  onMovePort: (pid: number, port: number) => void;
  onOpen: (port: number) => void;
  onTogglePin: (port: number) => void;
  onViewLogs: (pid: number) => void;
  onReserve: (group: ProcessGroup) => void;
  onEditTags: (group: ProcessGroup) => void;
  onHide: (name: string) => void;
  onDragStart: (key: string) => void;
  onDragOver: (e: React.DragEvent, key: string) => void;
  onDragEnd: () => void;
  dragKey: string;
  actionInProgress: boolean;
  cardClickBehavior: string;
  compact?: boolean;
}

const statusColors: Record<string, string> = {
  running: 'bg-emerald-500',
  suspended: 'bg-amber-500',
  stopped: 'bg-neutral-600',
};

const typeLabels: Record<string, { label: string; color: string }> = {
  web: { label: 'Web', color: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' },
  api: { label: 'API', color: 'bg-violet-500/15 text-violet-400 border border-violet-500/20' },
  database: { label: 'DB', color: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  system: { label: 'Sys', color: 'bg-neutral-500/15 text-neutral-400 border border-neutral-500/20' },
};

export default function ProcessCard({
  group,
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
  onHide,
  onDragStart,
  onDragOver,
  onDragEnd,
  dragKey,
  actionInProgress,
  cardClickBehavior,
  compact,
}: ProcessCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showKillConfirm, setShowKillConfirm] = useState(false);
  const [showMoveInput, setShowMoveInput] = useState(false);
  const [movePort, setMovePort] = useState('');
  const [faviconError, setFaviconError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const typeInfo = typeLabels[group.type] ?? typeLabels.system;
  const primaryPort = group.ports[0];

  const handleCardClick = () => {
    if (cardClickBehavior === 'openBrowser' && (group.type === 'web' || group.type === 'api')) {
      onOpen(primaryPort);
    } else {
      onViewLogs(group.primaryPid);
    }
  };

  const handleMoveSubmit = () => {
    const port = parseInt(movePort, 10);
    if (port >= 1 && port <= 65535) {
      onMovePort(group.primaryPid, port);
      setShowMoveInput(false);
      setMovePort('');
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(dragKey);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(e, dragKey);
      }}
      onDrop={(e) => {
        e.preventDefault();
      }}
      onDragEnd={onDragEnd}
      className={`
        bg-surface-800 dark:bg-surface-800 border border-surface-700/60 rounded-xl
        hover:border-surface-500/30 transition-all relative group
        cursor-grab active:cursor-grabbing
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* Header row: ports + type + status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-surface-400/50 cursor-grab font-mono text-xs select-none">:::</span>
          {group.ports.map((port) => (
            <span
              key={port}
              className="text-sm font-mono font-semibold text-indigo-400 cursor-pointer hover:text-indigo-300"
              onClick={() => onOpen(port)}
              title={`Open localhost:${port}`}
            >
              :{port}
            </span>
          ))}
          <span className={`${typeInfo.color} text-[10px] px-1.5 py-0.5 rounded font-mono`}>
            {typeInfo.label}
          </span>
          {group.isPortctl && (
            <span className="bg-indigo-500/15 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded border border-indigo-500/20 font-mono">portctl</span>
          )}
        </div>
        <div className={`w-2 h-2 rounded-full ${statusColors[group.status]} shrink-0`} title={group.status} />
      </div>

      {/* Process name + favicon */}
      <div className="mb-2 cursor-pointer" onClick={handleCardClick}>
        <div className="flex items-center gap-2">
          {group.faviconUrl && !faviconError && (
            <img
              src={group.faviconUrl}
              alt=""
              className="favicon-img"
              onError={() => setFaviconError(true)}
            />
          )}
          <span
            className="text-sm font-sans font-medium text-surface-200 truncate"
            title={group.displayName}
          >
            {group.displayName}
          </span>
          <span className="text-[10px] text-surface-400 font-mono ml-auto">
            PID {group.primaryPid}
          </span>
        </div>
        <div className="text-[11px] text-surface-500 mt-0.5 font-mono">
          {group.uptime && <span>up {group.uptime}</span>}
          {group.processes.length > 1 && (
            <span className="ml-2 text-surface-600">{group.processes.length} instances</span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="flex gap-4 text-[11px] text-surface-500 mb-3 font-mono">
        <span>CPU {group.totalCpu.toFixed(1)}%</span>
        <span>MEM {group.totalMemoryMB}MB</span>
      </div>

      {/* Tags */}
      {group.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {group.tags.map((tag) => (
            <span
              key={tag}
              className="bg-surface-700/60 text-surface-400 text-[10px] px-2 py-0.5 rounded-full font-mono"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {!group.isPortctl && !group.isSystem && (
          <div className="relative">
            <button
              className="text-[11px] bg-red-500/10 text-red-400/80 hover:bg-red-500/20 hover:text-red-400 px-2 py-1.5 rounded-lg transition disabled:opacity-50 font-mono"
              onClick={() => setShowKillConfirm(true)}
              disabled={actionInProgress}
            >
              Kill
            </button>
            {showKillConfirm && (
              <div className="absolute bottom-full left-0 mb-1 bg-surface-900 border border-surface-700 rounded-lg p-3 shadow-2xl z-20 min-w-[180px]">
                <p className="text-xs text-surface-200 mb-2 font-sans">Kill {group.displayName}?</p>
                {group.isSystem && (
                  <p className="text-xs text-amber-400 mb-2">System process — may affect system functionality.</p>
                )}
                <div className="flex gap-2">
                  <button
                    className="text-[11px] bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded font-mono"
                    onClick={() => {
                      onKill(group.primaryPid);
                      setShowKillConfirm(false);
                    }}
                  >
                    Kill
                  </button>
                  <button
                    className="text-[11px] bg-surface-700 hover:bg-surface-600 text-surface-300 px-3 py-1 rounded font-mono"
                    onClick={() => setShowKillConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!group.isPortctl && (
          <div className="relative">
            <button
              className="text-[11px] bg-surface-700/60 text-surface-400 hover:bg-surface-600/60 hover:text-surface-300 px-2 py-1.5 rounded-lg transition disabled:opacity-50 font-mono"
              onClick={() => setShowMoveInput(!showMoveInput)}
              disabled={actionInProgress}
            >
              Switch Port
            </button>
            {showMoveInput && (
              <div className="absolute bottom-full left-0 mb-1 bg-surface-900 border border-surface-700 rounded-lg p-3 shadow-2xl z-20">
                <p className="text-[11px] text-surface-400 mb-2 font-sans">Move to port:</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={movePort}
                    onChange={(e) => setMovePort(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMoveSubmit()}
                    className="w-24 bg-surface-800 border border-surface-700 text-surface-200 text-[11px] px-2 py-1 rounded font-mono"
                    placeholder="8080"
                    min={1}
                    max={65535}
                    autoFocus
                  />
                  <button
                    className="text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded font-mono"
                    onClick={handleMoveSubmit}
                  >
                    Move
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          className={`text-[11px] px-2 py-1.5 rounded-lg transition font-mono ${
            isPinned
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
              : 'bg-surface-700/60 text-surface-400 hover:bg-surface-600/60'
          }`}
          onClick={() => onTogglePin(primaryPort)}
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          {isPinned ? 'Unpin' : 'Pin'}
        </button>

        {/* Three-dot menu */}
        <div className="relative ml-auto">
          <button
            className="text-surface-500 hover:text-surface-300 text-sm px-1 font-mono"
            onClick={() => setShowMenu(!showMenu)}
          >
            &middot;&middot;&middot;
          </button>
          {showMenu && (
            <div
              ref={menuRef}
              className="absolute right-0 bottom-full mb-1 bg-surface-900 border border-surface-700 rounded-lg shadow-2xl z-30 min-w-[170px] py-1"
            >
              <MenuButton onClick={() => { onViewLogs(group.primaryPid); setShowMenu(false); }}>
                View Logs
              </MenuButton>
              <MenuButton onClick={() => { onOpen(primaryPort); setShowMenu(false); }}>
                Open in Browser
              </MenuButton>
              {!group.isPortctl && group.status === 'running' && (
                <MenuButton onClick={() => { onSuspend(group.primaryPid); setShowMenu(false); }}>
                  Suspend
                </MenuButton>
              )}
              {group.status === 'suspended' && (
                <MenuButton onClick={() => { onResume(group.primaryPid); setShowMenu(false); }}>
                  Resume
                </MenuButton>
              )}
              <MenuButton onClick={() => { onReserve(group); setShowMenu(false); }}>
                Reserve Port
              </MenuButton>
              <MenuButton onClick={() => { onEditTags(group); setShowMenu(false); }}>
                Edit Tags
              </MenuButton>
              <div className="border-t border-surface-700/50 my-1" />
              <MenuButton onClick={() => { onHide(group.displayName); setShowMenu(false); }}>
                Hide
              </MenuButton>
              <MenuButton onClick={() => { navigator.clipboard.writeText(String(group.primaryPid)); setShowMenu(false); }}>
                Copy PID
              </MenuButton>
              <MenuButton onClick={() => { navigator.clipboard.writeText(group.processes[0].command); setShowMenu(false); }}>
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
      className="w-full text-left text-[11px] text-surface-400 hover:bg-surface-800 hover:text-surface-200 px-3 py-1.5 transition font-mono"
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
  dragKey,
}: {
  port: number;
  reservation?: { label: string; restartTemplate: string | null };
  onUnpin: (port: number) => void;
  onDragStart: (key: string) => void;
  onDragOver: (e: React.DragEvent, key: string) => void;
  onDragEnd: () => void;
  dragKey: string;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(dragKey)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, dragKey);
      }}
      onDragEnd={onDragEnd}
      className="bg-surface-800/30 border border-surface-700/30 border-dashed rounded-xl p-4 opacity-50"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-surface-600 font-mono text-xs">:::</span>
          <span className="text-sm font-mono font-semibold text-surface-500">:{port}</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-neutral-700" />
      </div>
      <div className="text-[11px] text-surface-600 mb-3 font-sans italic">
        {reservation ? `Reserved for ${reservation.label}` : 'No process running'}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="text-[11px] bg-surface-700/40 text-surface-500 hover:text-surface-300 px-2 py-1.5 rounded-lg transition font-mono"
          onClick={() => onUnpin(port)}
        >
          Unpin
        </button>
      </div>
    </div>
  );
}
