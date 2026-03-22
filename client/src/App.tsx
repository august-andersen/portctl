import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { PortProcess, ViewMode, Theme } from '@shared/types';
import { useProcesses } from './hooks/useProcesses';
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
  } = useProcesses();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [showSettings, setShowSettings] = useState(false);
  const [logViewPid, setLogViewPid] = useState<number | null>(null);
  const [reserveProcess, setReserveProcess] = useState<PortProcess | null>(null);
  const [tagEditProcess, setTagEditProcess] = useState<PortProcess | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Apply config defaults
  const theme: Theme = config?.settings.theme ?? 'dark';
  const cardClickBehavior = config?.settings.cardClickBehavior ?? 'openBrowser';

  // Set view mode from config on first load
  React.useEffect(() => {
    if (config) setViewMode(config.settings.defaultView);
  }, [config?.settings.defaultView]);

  // Apply theme
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Filter processes
  const filteredProcesses = useMemo(() => {
    if (!searchQuery) return processes;
    const q = searchQuery.toLowerCase();
    return processes.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.port).includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.type.toLowerCase().includes(q)
    );
  }, [processes, searchQuery]);

  // Build ordered list of ports for card view (active + pinned)
  const orderedPorts = useMemo(() => {
    const activePorts = new Set(filteredProcesses.map((p) => p.port));
    const pinnedPorts = config?.pinnedPorts ?? [];
    const cardOrder = config?.cardOrder ?? [];

    // All ports that should be shown
    const allPorts = new Set([...activePorts, ...pinnedPorts]);

    // Sort by card order, then by port number for unordered
    const ordered = Array.from(allPorts).sort((a, b) => {
      const aIdx = cardOrder.indexOf(a);
      const bIdx = cardOrder.indexOf(b);
      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
      if (aIdx >= 0) return -1;
      if (bIdx >= 0) return 1;
      return a - b;
    });

    return ordered;
  }, [filteredProcesses, config?.pinnedPorts, config?.cardOrder]);

  // Drag and drop handlers
  const handleDragStart = useCallback((port: number) => {
    dragItem.current = port;
  }, []);

  const handleDragOver = useCallback((port: number) => {
    dragOverItem.current = port;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const newOrder = [...orderedPorts];
    const fromIdx = newOrder.indexOf(dragItem.current);
    const toIdx = newOrder.indexOf(dragOverItem.current);

    if (fromIdx >= 0 && toIdx >= 0) {
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, dragItem.current);
      updateCardOrder(newOrder);
    }

    dragItem.current = null;
    dragOverItem.current = null;
  }, [orderedPorts, updateCardOrder]);

  const handleThemeToggle = useCallback(() => {
    updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' });
  }, [theme, updateSettings]);

  const logViewProcess = logViewPid !== null ? processes.find((p) => p.pid === logViewPid) : null;

  if (loading && processes.length === 0) {
    return (
      <div className="dark bg-surface-950 min-h-screen flex items-center justify-center">
        <div className="text-surface-200/50">Loading portctl...</div>
      </div>
    );
  }

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} bg-surface-950 min-h-screen text-surface-200`}>
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Discovery failure banner */}
      {discoveryFailures >= 3 && (
        <div className="bg-red-600/20 text-red-400 text-sm px-6 py-2 text-center">
          Process discovery is failing. Check if lsof is available.
        </div>
      )}

      <main className="p-6">
        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orderedPorts.map((port) => {
              const proc = filteredProcesses.find((p) => p.port === port);
              const isPinned = config?.pinnedPorts.includes(port) ?? false;

              if (!proc) {
                // Empty pinned card
                const reservation = config?.reservations.find((r) => r.port === port);
                return (
                  <EmptyPortCard
                    key={port}
                    port={port}
                    reservation={reservation ? { label: reservation.label, restartTemplate: reservation.restartTemplate } : undefined}
                    onUnpin={togglePin}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  />
                );
              }

              return (
                <ProcessCard
                  key={proc.pid}
                  process={proc}
                  isPinned={isPinned}
                  onKill={killProc}
                  onSuspend={suspendProc}
                  onResume={resumeProc}
                  onMovePort={moveProc}
                  onOpen={openProc}
                  onTogglePin={togglePin}
                  onViewLogs={setLogViewPid}
                  onReserve={setReserveProcess}
                  onEditTags={setTagEditProcess}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  actionInProgress={isActionInProgress(proc.pid)}
                  cardClickBehavior={cardClickBehavior}
                />
              );
            })}
          </div>
        ) : (
          <TableView
            processes={filteredProcesses}
            onKill={killProc}
            onSuspend={suspendProc}
            onResume={resumeProc}
            onMovePort={moveProc}
            onOpen={openProc}
            onViewLogs={setLogViewPid}
          />
        )}

        {filteredProcesses.length === 0 && orderedPorts.length === 0 && (
          <div className="text-center text-surface-200/30 py-20">
            <p className="text-xl mb-2">No processes found</p>
            <p className="text-sm">Start a dev server and it will appear here automatically.</p>
          </div>
        )}
      </main>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Settings Modal */}
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

      {/* Log Viewer */}
      {logViewProcess && (
        <LogViewer
          process={logViewProcess}
          getLogs={getLogs}
          onClose={() => setLogViewPid(null)}
        />
      )}

      {/* Reserve Modal */}
      {reserveProcess && (
        <ReserveModal
          process={reserveProcess}
          onReserve={addReservation}
          onClose={() => setReserveProcess(null)}
        />
      )}

      {/* Tag Editor */}
      {tagEditProcess && (
        <TagEditor
          process={tagEditProcess}
          onSave={updateTags}
          onClose={() => setTagEditProcess(null)}
        />
      )}
    </div>
  );
}
