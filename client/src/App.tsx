import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { PortProcess, ProcessGroup, ViewMode, Theme, Reservation } from '@shared/types';
import { useProcesses } from './hooks/useProcesses';
import { groupProcesses } from './utils/groupProcesses';
import Header from './components/Header';
import ProcessCard, { EmptyPortCard } from './components/ProcessCard';
import TableView from './components/TableView';
import ToastContainer from './components/Toast';
import Settings from './components/Settings';
import LogViewer from './components/LogViewer';
import ReserveModal from './components/ReserveModal';
import TagEditor from './components/TagEditor';

export default function App() {
  const {
    processes,
    config,
    toasts,
    discoveryFailures,
    loading,
    isActionInProgress,
    removeToast,
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
    hideProcess,
    renameProcess,
    unhideProcess,
  } = useProcesses();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [showSettings, setShowSettings] = useState(false);
  const [logViewPid, setLogViewPid] = useState<number | null>(null);
  const [reserveGroup, setReserveGroup] = useState<ProcessGroup | null>(null);
  const [tagEditGroup, setTagEditGroup] = useState<ProcessGroup | null>(null);
  const [showSystem, setShowSystem] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  // Drag state
  const dragFrom = useRef<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const theme: Theme = config?.settings.theme ?? 'dark';
  const cardClickBehavior = config?.settings.cardClickBehavior ?? 'openBrowser';
  const hiddenNames = useMemo(() => new Set(config?.hiddenProcesses ?? []), [config?.hiddenProcesses]);

  React.useEffect(() => {
    if (config) setViewMode(config.settings.defaultView);
  }, [config?.settings.defaultView]);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light-mode', theme !== 'dark');
  }, [theme]);

  // Group and filter processes
  const customNames = config?.customNames;
  const allGroups = useMemo(() => groupProcesses(processes, customNames), [processes, customNames]);

  const { pinnedGroups, mainGroups, hiddenGroups, systemGroups } = useMemo(() => {
    const pinnedPorts = new Set(config?.pinnedPorts ?? []);
    const pinned: ProcessGroup[] = [];
    const main: ProcessGroup[] = [];
    const hidden: ProcessGroup[] = [];
    const system: ProcessGroup[] = [];

    for (const group of allGroups) {
      // Hidden by user
      if (hiddenNames.has(group.displayName)) {
        hidden.push(group);
        continue;
      }

      // System processes
      if (group.isSystem && !group.isPortctl) {
        system.push(group);
        continue;
      }

      // Pinned — any group whose ports overlap with pinned ports
      const isPinned = group.ports.some((p) => pinnedPorts.has(p));
      if (isPinned) {
        pinned.push(group);
      } else {
        main.push(group);
      }
    }

    return { pinnedGroups: pinned, mainGroups: main, hiddenGroups: hidden, systemGroups: system };
  }, [allGroups, config?.pinnedPorts, hiddenNames]);

  // Search filter
  const filterGroup = useCallback(
    (g: ProcessGroup) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        g.displayName.toLowerCase().includes(q) ||
        g.ports.some((p) => String(p).includes(q)) ||
        g.tags.some((t) => t.toLowerCase().includes(q)) ||
        g.type.toLowerCase().includes(q)
      );
    },
    [searchQuery]
  );

  const filteredPinned = useMemo(() => pinnedGroups.filter(filterGroup), [pinnedGroups, filterGroup]);
  const filteredMain = useMemo(() => mainGroups.filter(filterGroup), [mainGroups, filterGroup]);
  const filteredSystem = useMemo(
    () => (showSystem ? systemGroups.filter(filterGroup) : []),
    [showSystem, systemGroups, filterGroup]
  );

  // Card ordering: use config cardOrder to sort groups by their primary port
  const sortGroups = useCallback(
    (groups: ProcessGroup[]) => {
      const cardOrder = config?.cardOrder ?? [];
      return [...groups].sort((a, b) => {
        const aIdx = cardOrder.indexOf(a.ports[0]);
        const bIdx = cardOrder.indexOf(b.ports[0]);
        if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
        if (aIdx >= 0) return -1;
        if (bIdx >= 0) return 1;
        return a.ports[0] - b.ports[0];
      });
    },
    [config?.cardOrder]
  );

  const orderedPinned = useMemo(() => sortGroups(filteredPinned), [filteredPinned, sortGroups]);
  const orderedMain = useMemo(() => sortGroups(filteredMain), [filteredMain, sortGroups]);
  const orderedSystem = useMemo(() => sortGroups(filteredSystem), [filteredSystem, sortGroups]);

  // Pinned ports with no active process
  const emptyPinnedPorts = useMemo(() => {
    const activePorts = new Set(allGroups.flatMap((g) => g.ports));
    return (config?.pinnedPorts ?? []).filter((p) => !activePorts.has(p));
  }, [allGroups, config?.pinnedPorts]);

  // ── Drag and drop: swap positions ──
  const handleDragStart = useCallback((key: string) => {
    dragFrom.current = key;
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, key: string) => {
    setDragOverKey(key);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragFrom.current || !dragOverKey || dragFrom.current === dragOverKey) {
      dragFrom.current = null;
      setDragOverKey(null);
      return;
    }

    // Parse keys to port numbers
    const fromPort = parseInt(dragFrom.current.replace('port-', '').replace('empty-', ''), 10);
    const toPort = parseInt(dragOverKey.replace('port-', '').replace('empty-', ''), 10);

    if (!isNaN(fromPort) && !isNaN(toPort)) {
      // Build new order by swapping positions
      const allPorts = [
        ...orderedPinned.flatMap((g) => g.ports),
        ...emptyPinnedPorts,
        ...orderedMain.flatMap((g) => g.ports),
        ...orderedSystem.flatMap((g) => g.ports),
      ];

      const fromIdx = allPorts.indexOf(fromPort);
      const toIdx = allPorts.indexOf(toPort);

      if (fromIdx >= 0 && toIdx >= 0) {
        // Swap
        const newOrder = [...allPorts];
        newOrder[fromIdx] = toPort;
        newOrder[toIdx] = fromPort;
        updateCardOrder(newOrder);
      }
    }

    dragFrom.current = null;
    setDragOverKey(null);
  }, [dragOverKey, orderedPinned, orderedMain, orderedSystem, emptyPinnedPorts, updateCardOrder]);

  const handleThemeToggle = useCallback(() => {
    updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' });
  }, [theme, updateSettings]);

  const handleHide = useCallback(
    (name: string) => {
      hideProcess(name);
    },
    [hideProcess]
  );

  const handleUnhide = useCallback(
    (name: string) => {
      unhideProcess(name);
    },
    [unhideProcess]
  );

  // Find process for log viewer
  const logViewProcess = logViewPid !== null ? processes.find((p) => p.pid === logViewPid) : null;

  // Card renderer
  const renderGroupCard = (group: ProcessGroup, section: string) => {
    const key = `port-${group.ports[0]}`;
    const isPinned = group.ports.some((p) => config?.pinnedPorts.includes(p));
    return (
      <ProcessCard
        key={key}
        group={group}
        isPinned={isPinned}
        onKill={killProc}
        onSuspend={suspendProc}
        onResume={resumeProc}
        onMovePort={moveProc}
        onOpen={openProc}
        onTogglePin={togglePin}
        onViewLogs={setLogViewPid}
        onReserve={setReserveGroup}
        onEditTags={setTagEditGroup}
        onHide={handleHide}
        onRename={(name) => renameProcess(`port:${group.ports[0]}`, name)}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        dragKey={key}
        actionInProgress={isActionInProgress(group.primaryPid)}
        cardClickBehavior={cardClickBehavior}
        compact={section === 'system'}
      />
    );
  };

  if (loading && processes.length === 0) {
    return (
      <div className="dark bg-surface-950 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-surface-500 text-sm font-sans">Discovering processes…</span>
        </div>
      </div>
    );
  }

  const totalVisible = orderedPinned.length + orderedMain.length + orderedSystem.length + emptyPinnedPorts.length;

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} ${theme !== 'dark' ? 'light-mode' : ''} bg-surface-950 min-h-screen text-surface-200`}>
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onOpenSettings={() => setShowSettings(true)}
        showSystem={showSystem}
        onToggleSystem={() => setShowSystem(!showSystem)}
        hiddenCount={hiddenGroups.length}
        showHidden={showHidden}
        onToggleHidden={() => setShowHidden(!showHidden)}
      />

      {discoveryFailures >= 3 && (
        <div className="bg-red-500/8 text-red-400/80 text-xs px-6 py-2 text-center font-mono border-b border-red-500/10">
          Process discovery is failing — check if lsof is available.
        </div>
      )}

      <main className="px-6 py-5 max-w-[1800px] mx-auto">
        {viewMode === 'card' ? (
          <>
            {/* Pinned section */}
            {(orderedPinned.length > 0 || emptyPinnedPorts.length > 0) && (
              <section className="mb-7">
                <SectionHeader label="Pinned" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {orderedPinned.map((g) => renderGroupCard(g, 'pinned'))}
                  {emptyPinnedPorts.map((port) => {
                    const reservation = config?.reservations.find((r) => r.port === port);
                    const key = `empty-${port}`;
                    return (
                      <EmptyPortCard
                        key={key}
                        port={port}
                        reservation={reservation ? { label: reservation.label, restartTemplate: reservation.restartTemplate } : undefined}
                        onUnpin={togglePin}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        dragKey={key}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Main processes */}
            {orderedMain.length > 0 && (
              <section className="mb-7">
                {orderedPinned.length > 0 && <SectionHeader label="Processes" />}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {orderedMain.map((g) => renderGroupCard(g, 'main'))}
                </div>
              </section>
            )}

            {/* System processes (toggled) */}
            {orderedSystem.length > 0 && (
              <section className="mb-7">
                <SectionHeader label="System" count={systemGroups.length} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {orderedSystem.map((g) => renderGroupCard(g, 'system'))}
                </div>
              </section>
            )}

            {/* Hidden section (toggled) */}
            {showHidden && hiddenGroups.length > 0 && (
              <section className="mb-7">
                <SectionHeader label="Hidden" count={hiddenGroups.length} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {hiddenGroups.map((g) => (
                    <div
                      key={g.displayName}
                      className="bg-surface-800/20 border border-white/[0.05] rounded-xl p-4 opacity-50 hover:opacity-70 transition-opacity"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-surface-500">
                            {g.ports.map((p) => `:${p}`).join(' ')}
                          </span>
                          <span className="text-sm font-sans text-surface-400">{g.displayName}</span>
                        </div>
                        <button
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono transition"
                          onClick={() => handleUnhide(g.displayName)}
                        >
                          Unhide
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {totalVisible === 0 && (
              <div className="text-center py-24">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-800 border border-white/[0.06] mb-4">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-surface-500">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6.5 10h7M10 6.5v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-surface-400 text-sm font-sans font-medium mb-1">No processes found</p>
                <p className="text-surface-600 text-xs font-mono">Start a dev server and it will appear here automatically.</p>
              </div>
            )}
          </>
        ) : (
          <TableView
            processes={processes.filter((p) => !p.isSystem || showSystem)}
            onKill={killProc}
            onSuspend={suspendProc}
            onResume={resumeProc}
            onMovePort={moveProc}
            onOpen={openProc}
            onViewLogs={setLogViewPid}
          />
        )}
      </main>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {showSettings && config && (
        <Settings
          config={config}
          onClose={() => setShowSettings(false)}
          onUpdateSettings={updateSettings}
          onAddReservation={addReservation}
          onRemoveReservation={removeReservation}
          onAddBlockedPort={addBlockedPort}
          onRemoveBlockedPort={removeBlockedPort}
          onTogglePin={togglePin}
        />
      )}

      {logViewProcess && (
        <LogViewer
          process={logViewProcess}
          getLogs={getLogs}
          onClose={() => setLogViewPid(null)}
        />
      )}

      {reserveGroup && (
        <ReserveModal
          process={reserveGroup.processes[0]}
          onReserve={addReservation}
          onClose={() => setReserveGroup(null)}
        />
      )}

      {tagEditGroup && (
        <TagEditor
          process={tagEditGroup.processes[0]}
          onSave={updateTags}
          onClose={() => setTagEditGroup(null)}
        />
      )}
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="section-label text-surface-500">{label}</span>
      {count !== undefined && (
        <span className="text-[10px] text-surface-600 font-mono bg-surface-800/60 px-1.5 py-0.5 rounded-md border border-white/[0.04]">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-gradient-to-r from-surface-700/30 to-transparent" />
    </div>
  );
}
