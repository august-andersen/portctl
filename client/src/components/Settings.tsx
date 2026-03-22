import React, { useState } from 'react';
import type { PortctlConfig, Reservation } from '@shared/types';

interface SettingsProps {
  config: PortctlConfig;
  onClose: () => void;
  onUpdateSettings: (settings: Partial<PortctlConfig['settings']>) => void;
  onAddReservation: (reservation: Reservation) => void;
  onRemoveReservation: (port: number) => void;
  onAddBlockedPort: (port: number) => void;
  onRemoveBlockedPort: (port: number) => void;
  onTogglePin: (port: number) => void;
}

type SettingsTab = 'general' | 'reservations' | 'blocked' | 'pinned' | 'about';

export default function Settings({
  config,
  onClose,
  onUpdateSettings,
  onAddReservation,
  onRemoveReservation,
  onAddBlockedPort,
  onRemoveBlockedPort,
  onTogglePin,
}: SettingsProps) {
  const [tab, setTab] = useState<SettingsTab>('general');
  const [newBlockedPort, setNewBlockedPort] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'reservations', label: 'Reservations' },
    { id: 'blocked', label: 'Blocked Ports' },
    { id: 'pinned', label: 'Pinned Ports' },
    { id: 'about', label: 'About' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl flex flex-col" style={{ width: '70vw', maxWidth: '800px', height: '70vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <h2 className="text-lg font-bold text-surface-200">Settings</h2>
          <button className="text-surface-200/50 hover:text-surface-200 text-xl" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-surface-700 py-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`w-full text-left text-sm px-4 py-2 transition ${
                  tab === t.id
                    ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                    : 'text-surface-200/50 hover:text-surface-200 hover:bg-surface-800'
                }`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'general' && (
              <div className="space-y-4">
                <SettingRow label="Dashboard Port" description="Port for the portctl web UI">
                  <input
                    type="number"
                    value={config.settings.dashboardPort}
                    onChange={(e) => onUpdateSettings({ dashboardPort: parseInt(e.target.value, 10) })}
                    className="bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-1.5 rounded w-24"
                  />
                </SettingRow>
                <SettingRow label="Polling Interval" description="How often to check for processes (ms)">
                  <input
                    type="number"
                    value={config.settings.pollingInterval}
                    onChange={(e) => onUpdateSettings({ pollingInterval: parseInt(e.target.value, 10) })}
                    className="bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-1.5 rounded w-24"
                    step={100}
                    min={500}
                  />
                </SettingRow>
                <SettingRow label="Default View" description="Initial view mode">
                  <select
                    value={config.settings.defaultView}
                    onChange={(e) => onUpdateSettings({ defaultView: e.target.value as 'card' | 'table' })}
                    className="bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-1.5 rounded"
                  >
                    <option value="card">Card</option>
                    <option value="table">Table</option>
                  </select>
                </SettingRow>
                <SettingRow label="Theme" description="Dashboard color scheme">
                  <select
                    value={config.settings.theme}
                    onChange={(e) => onUpdateSettings({ theme: e.target.value as 'dark' | 'light' })}
                    className="bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-1.5 rounded"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </SettingRow>
                <SettingRow label="Card Click" description="What happens when you click a card">
                  <select
                    value={config.settings.cardClickBehavior}
                    onChange={(e) => onUpdateSettings({ cardClickBehavior: e.target.value as 'openBrowser' | 'openLogs' })}
                    className="bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-1.5 rounded"
                  >
                    <option value="openBrowser">Open in Browser</option>
                    <option value="openLogs">View Logs</option>
                  </select>
                </SettingRow>
                <SettingRow label="Log Buffer" description="Max lines per process">
                  <input
                    type="number"
                    value={config.settings.logBufferSize}
                    onChange={(e) => onUpdateSettings({ logBufferSize: parseInt(e.target.value, 10) })}
                    className="bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-1.5 rounded w-24"
                    step={1000}
                    min={100}
                  />
                </SettingRow>
              </div>
            )}

            {tab === 'reservations' && (
              <div className="space-y-3">
                {config.reservations.length === 0 ? (
                  <p className="text-surface-200/30 text-sm">
                    No port reservations. Use the "Reserve Port" option on a process card to create one.
                  </p>
                ) : (
                  config.reservations.map((r) => (
                    <div
                      key={r.port}
                      className="bg-surface-800 border border-surface-700 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium text-surface-200">
                          Port {r.port} — {r.label || 'Unnamed'}
                        </div>
                        <div className="text-xs text-surface-200/50 mt-0.5">
                          {r.matcher.type}: {r.matcher.value}
                        </div>
                        {r.restartTemplate && (
                          <div className="text-xs text-surface-200/30 mt-0.5 font-mono">
                            {r.restartTemplate}
                          </div>
                        )}
                      </div>
                      <button
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                        onClick={() => onRemoveReservation(r.port)}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'blocked' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newBlockedPort}
                    onChange={(e) => setNewBlockedPort(e.target.value)}
                    placeholder="Port number"
                    className="bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-1.5 rounded w-32"
                    min={1}
                    max={65535}
                  />
                  <button
                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded"
                    onClick={() => {
                      const port = parseInt(newBlockedPort, 10);
                      if (port >= 1 && port <= 65535) {
                        onAddBlockedPort(port);
                        setNewBlockedPort('');
                      }
                    }}
                  >
                    Block Port
                  </button>
                </div>
                {config.blockedPorts.map((port) => (
                  <div
                    key={port}
                    className="bg-surface-800 border border-surface-700 rounded-lg p-3 flex items-center justify-between"
                  >
                    <span className="text-sm font-mono text-surface-200">Port {port}</span>
                    <button
                      className="text-xs text-red-400 hover:text-red-300"
                      onClick={() => onRemoveBlockedPort(port)}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
                {config.blockedPorts.length === 0 && (
                  <p className="text-surface-200/30 text-sm">No blocked ports</p>
                )}
              </div>
            )}

            {tab === 'pinned' && (
              <div className="space-y-3">
                {config.pinnedPorts.map((port) => (
                  <div
                    key={port}
                    className="bg-surface-800 border border-surface-700 rounded-lg p-3 flex items-center justify-between"
                  >
                    <span className="text-sm font-mono text-surface-200">Port {port}</span>
                    <button
                      className="text-xs text-red-400 hover:text-red-300"
                      onClick={() => onTogglePin(port)}
                    >
                      Unpin
                    </button>
                  </div>
                ))}
                {config.pinnedPorts.length === 0 && (
                  <p className="text-surface-200/30 text-sm">No pinned ports</p>
                )}
              </div>
            )}

            {tab === 'about' && (
              <div className="space-y-3">
                <p className="text-sm text-surface-200">
                  <strong>portctl</strong> v1.0.0
                </p>
                <p className="text-xs text-surface-200/50">
                  A local macOS dashboard for managing processes listening on network ports.
                </p>
                <a
                  href="https://github.com/august-andersen/portctl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  GitHub Repository
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-surface-200">{label}</div>
        <div className="text-xs text-surface-200/40">{description}</div>
      </div>
      {children}
    </div>
  );
}
