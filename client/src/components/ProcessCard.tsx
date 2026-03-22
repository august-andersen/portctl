import React, { useState, useRef } from 'react';
import type { ProcessGroup } from '@shared/types';
import Popover from './Popover';

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
  onRename: (name: string) => void;
  onDragStart: (key: string) => void;
  onDragOver: (e: React.DragEvent, key: string) => void;
  onDragEnd: () => void;
  dragKey: string;
  actionInProgress: boolean;
  cardClickBehavior: string;
  compact?: boolean;
}

const statusDot: Record<string, string> = {
  running: 'bg-emerald-400 status-dot-running',
  suspended: 'bg-amber-400 status-dot-suspended',
  stopped: 'bg-neutral-600',
};

const statusLeftBorder: Record<string, string> = {
  running: 'border-l-emerald-500/70',
  suspended: 'border-l-amber-500/70',
  stopped: 'border-l-neutral-700/50',
};

const typeChip: Record<string, { label: string; cls: string }> = {
  web:      { label: 'Web', cls: 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' },
  api:      { label: 'API', cls: 'bg-violet-500/12 text-violet-400 border border-violet-500/20' },
  database: { label: 'DB',  cls: 'bg-amber-500/12  text-amber-400  border border-amber-500/20' },
  system:   { label: 'Sys', cls: 'bg-neutral-500/12 text-neutral-400 border border-neutral-500/20' },
};

const PinIcon = ({ filled }: { filled: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M5 1h2l.5 3 1.5 1v1H7l-.5 5h-1L5 6H3V5l1.5-1L5 1z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      fill={filled ? 'currentColor' : 'none'}
    />
  </svg>
);

const DotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="3" r="1.1" fill="currentColor" />
    <circle cx="7" cy="7" r="1.1" fill="currentColor" />
    <circle cx="7" cy="11" r="1.1" fill="currentColor" />
  </svg>
);

const DragHandle = () => (
  <svg width="10" height="14" viewBox="0 0 10 14" fill="none" className="text-surface-600 shrink-0">
    <circle cx="3" cy="3" r="1" fill="currentColor" />
    <circle cx="7" cy="3" r="1" fill="currentColor" />
    <circle cx="3" cy="7" r="1" fill="currentColor" />
    <circle cx="7" cy="7" r="1" fill="currentColor" />
    <circle cx="3" cy="11" r="1" fill="currentColor" />
    <circle cx="7" cy="11" r="1" fill="currentColor" />
  </svg>
);

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
  onRename,
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
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(group.displayName);

  const killBtnRef = useRef<HTMLButtonElement>(null);
  const moveBtnRef = useRef<HTMLButtonElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const typeInfo = typeChip[group.type] ?? typeChip.system;
  const primaryPort = group.ports[0];
  const borderCls = statusLeftBorder[group.status] ?? statusLeftBorder.stopped;
  const dotCls = statusDot[group.status] ?? statusDot.stopped;

  const handleCardClick = () => {
    if (cardClickBehavior === 'openBrowser' && (group.type === 'web' || group.type === 'api')) {
      onOpen(primaryPort);
    } else {
      onViewLogs(group.primaryPid);
    }
  };

  const handleNameClick = () => {
    clickTimer.current = setTimeout(() => {
      handleCardClick();
    }, 200);
  };

  const handleNameDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    setRenameValue(group.displayName);
    setIsRenaming(true);
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
      onDrop={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      className={`
        group relative flex flex-col
        bg-surface-800 border border-white/[0.07] border-l-2 ${borderCls}
        rounded-xl overflow-hidden
        hover:border-indigo-500/25 hover:border-l-2
        hover:shadow-xl hover:shadow-black/40
        hover:-translate-y-px
        transition-all duration-200
        cursor-grab active:cursor-grabbing
        ${actionInProgress ? 'opacity-70' : ''}
        ${compact ? '' : ''}
      `}
    >
      {/* ── Body ─────────────────────────────────────── */}
      <div className={`flex-1 ${compact ? 'p-3' : 'p-4'}`}>

        {/* Row 1: drag + ports + type badge + status dot + menu */}
        <div className="flex items-center gap-2 mb-3">
          <span className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
            <DragHandle />
          </span>

          {/* Ports */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {group.ports.map((port) => (
              <button
                key={port}
                className={`font-mono font-bold text-indigo-300 hover:text-indigo-100 transition-colors ${compact ? 'text-base' : 'text-lg'} leading-none`}
                onClick={() => onOpen(port)}
                title={`Open localhost:${port}`}
              >
                :{port}
              </button>
            ))}
            <span className={`${typeInfo.cls} text-[10px] px-1.5 py-0.5 rounded-md font-mono leading-none`}>
              {typeInfo.label}
            </span>
            {group.isPortctl && (
              <span className="bg-indigo-500/10 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded-md border border-indigo-500/20 font-mono leading-none">
                portctl
              </span>
            )}
          </div>

          {/* Status dot */}
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`}
            title={group.status}
          />

          {/* Three-dot menu */}
          <button
            ref={menuBtnRef}
            className="text-surface-600 hover:text-surface-300 transition opacity-0 group-hover:opacity-100 p-0.5 -mr-1"
            onClick={() => setShowMenu(!showMenu)}
            title="More options"
          >
            <DotsIcon />
          </button>
          <Popover
            open={showMenu}
            onClose={() => setShowMenu(false)}
            anchorRef={menuBtnRef}
            align="right"
            className="min-w-[170px] py-1 overflow-hidden"
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
            <MenuButton onClick={() => {
              setShowMenu(false);
              setRenameValue(group.displayName);
              setIsRenaming(true);
            }}>
              Rename
            </MenuButton>
            <div className="border-t border-white/[0.06] my-1" />
            <MenuButton onClick={() => { onHide(group.displayName); setShowMenu(false); }}>
              Hide
            </MenuButton>
            <MenuButton onClick={() => { navigator.clipboard.writeText(String(group.primaryPid)); setShowMenu(false); }}>
              Copy PID
            </MenuButton>
            <MenuButton onClick={() => { navigator.clipboard.writeText(group.processes[0].command); setShowMenu(false); }}>
              Copy Command
            </MenuButton>
          </Popover>
        </div>

        {/* Row 2: name + favicon + PID */}
        <div className="mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {group.faviconUrl && !faviconError && (
              <img
                src={group.faviconUrl}
                alt=""
                className="favicon-img shrink-0"
                onError={() => setFaviconError(true)}
              />
            )}
            {isRenaming ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onRename(renameValue);
                    setIsRenaming(false);
                  } else if (e.key === 'Escape') {
                    setRenameValue(group.displayName);
                    setIsRenaming(false);
                  }
                }}
                onBlur={() => {
                  if (renameValue !== group.displayName) onRename(renameValue);
                  setIsRenaming(false);
                }}
                className="text-sm font-semibold text-surface-100 bg-surface-700 border border-indigo-500/50 rounded-md px-2 py-0.5 outline-none w-full max-w-[180px] font-sans"
                autoFocus
              />
            ) : (
              <span
                className="text-sm font-semibold text-surface-100 truncate cursor-pointer hover:text-white transition-colors"
                title={`${group.displayName} — double-click to rename`}
                onClick={handleNameClick}
                onDoubleClick={handleNameDoubleClick}
              >
                {group.displayName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-surface-500 font-mono">
            {group.uptime && <span>up {group.uptime}</span>}
            {group.uptime && <span className="text-surface-700">·</span>}
            <span>PID {group.primaryPid}</span>
            {group.processes.length > 1 && (
              <>
                <span className="text-surface-700">·</span>
                <span>{group.processes.length} instances</span>
              </>
            )}
          </div>
        </div>

        {/* Row 3: metrics */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[11px] font-mono text-surface-500 bg-surface-700/50 px-2 py-0.5 rounded-md">
            CPU {group.totalCpu.toFixed(1)}%
          </span>
          <span className="text-[11px] font-mono text-surface-500 bg-surface-700/50 px-2 py-0.5 rounded-md">
            {group.totalMemoryMB}MB
          </span>
        </div>

        {/* Row 4: tags */}
        {group.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {group.tags.map((tag) => (
              <span
                key={tag}
                className="bg-surface-700/60 text-surface-400 text-[10px] px-2 py-0.5 rounded-full font-mono border border-white/[0.04]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer actions ────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 py-2 border-t border-white/[0.045] bg-surface-900/30">

        {/* Kill */}
        {!group.isPortctl && !group.isSystem && (
          <>
            <button
              ref={killBtnRef}
              className="text-[11px] font-mono text-red-400/70 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-md transition disabled:opacity-40"
              onClick={() => setShowKillConfirm(!showKillConfirm)}
              disabled={actionInProgress}
            >
              Kill
            </button>
            <Popover
              open={showKillConfirm}
              onClose={() => setShowKillConfirm(false)}
              anchorRef={killBtnRef}
              className="p-3.5 min-w-[190px]"
            >
              <p className="text-xs text-surface-200 mb-3 font-sans">
                Kill <span className="font-semibold text-surface-100">{group.displayName}</span>?
              </p>
              <div className="flex gap-2">
                <button
                  className="text-[11px] bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg font-mono transition"
                  onClick={() => {
                    onKill(group.primaryPid);
                    setShowKillConfirm(false);
                  }}
                >
                  Kill
                </button>
                <button
                  className="text-[11px] bg-surface-700 hover:bg-surface-600 text-surface-300 px-3 py-1.5 rounded-lg font-mono transition"
                  onClick={() => setShowKillConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </Popover>
          </>
        )}

        {/* Suspend / Resume */}
        {!group.isPortctl && group.status === 'running' && (
          <button
            className="text-[11px] font-mono text-surface-400 hover:text-amber-400 hover:bg-amber-500/10 px-2 py-1 rounded-md transition disabled:opacity-40"
            onClick={() => onSuspend(group.primaryPid)}
            disabled={actionInProgress}
          >
            Pause
          </button>
        )}
        {group.status === 'suspended' && (
          <button
            className="text-[11px] font-mono text-amber-400 hover:text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded-md transition disabled:opacity-40"
            onClick={() => onResume(group.primaryPid)}
            disabled={actionInProgress}
          >
            Resume
          </button>
        )}

        {/* Switch Port */}
        {!group.isPortctl && (
          <>
            <button
              ref={moveBtnRef}
              className="text-[11px] font-mono text-surface-400 hover:text-surface-200 hover:bg-surface-700/60 px-2 py-1 rounded-md transition disabled:opacity-40"
              onClick={() => setShowMoveInput(!showMoveInput)}
              disabled={actionInProgress}
            >
              Switch Port
            </button>
            <Popover
              open={showMoveInput}
              onClose={() => setShowMoveInput(false)}
              anchorRef={moveBtnRef}
              className="p-3"
            >
              <p className="text-[11px] text-surface-400 mb-2 font-mono">Move to port:</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={movePort}
                  onChange={(e) => setMovePort(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMoveSubmit()}
                  className="w-24 bg-surface-800 border border-white/[0.1] text-surface-200 text-[11px] px-2 py-1.5 rounded-lg font-mono focus:outline-none focus:border-indigo-500/50"
                  placeholder="8080"
                  min={1}
                  max={65535}
                  autoFocus
                />
                <button
                  className="text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-mono transition"
                  onClick={handleMoveSubmit}
                >
                  Move
                </button>
              </div>
            </Popover>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Pin */}
        <button
          className={`flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md transition ${
            isPinned
              ? 'text-amber-400 hover:text-amber-300'
              : 'text-surface-500 hover:text-surface-300 hover:bg-surface-700/60'
          }`}
          onClick={() => onTogglePin(primaryPort)}
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          <PinIcon filled={isPinned} />
          {isPinned ? 'Pinned' : 'Pin'}
        </button>
      </div>
    </div>
  );
}

function MenuButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="w-full text-left text-[11px] text-surface-400 hover:bg-white/[0.05] hover:text-surface-100 px-3 py-1.5 transition font-sans"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ── Empty pinned card ──────────────────────────────────────
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
      className="group relative flex flex-col bg-surface-800/25 border border-dashed border-white/[0.07] rounded-xl overflow-hidden opacity-50 hover:opacity-70 transition-opacity cursor-grab"
    >
      <div className="flex-1 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono font-bold text-lg text-surface-500">:{port}</span>
          <div className="w-2 h-2 rounded-full bg-neutral-700 ml-auto" />
        </div>
        <p className="text-[11px] text-surface-600 italic">
          {reservation ? `Reserved for ${reservation.label}` : 'No process running'}
        </p>
      </div>
      <div className="flex items-center gap-1 px-4 py-2 border-t border-white/[0.04]">
        <button
          className="text-[11px] font-mono text-surface-500 hover:text-surface-300 px-2 py-1 rounded-md transition"
          onClick={() => onUnpin(port)}
        >
          Unpin
        </button>
      </div>
    </div>
  );
}
