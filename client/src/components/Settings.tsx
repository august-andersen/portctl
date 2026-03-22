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

const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
  { id: 'general',      label: 'General',      icon: '⚙' },
  { id: 'reservations', label: 'Reservations',  icon: '◈' },
  { id: 'blocked',      label: 'Blocked Ports', icon: '⊘' },
  { id: 'pinned',       label: 'Pinned Ports',  icon: '◆' },
  { id: 'about',        label: 'About',         icon: 'ℹ' },
];

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-surface-900 border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '70vw', maxWidth: '780px', height: '68vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-surface-100 font-sans">Settings</h2>
          <button
            className="text-surface-500 hover:text-surface-200 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition text-lg leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <nav className="w-44 border-r border-white/[0.06] py-2 shrink-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`w-full text-left flex items-center gap-2.5 text-[13px] px-4 py-2.5 transition font-sans ${
                  tab === t.id
                    ? 'bg-indigo-500/12 text-indigo-300 border-r-2 border-indigo-400'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.03]'
                }`}
                onClick={() => setTab(t.id)}
              >
                <span className="text-base leading-none opacity-70">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'general' && (
              <div className="space-y-1">
                <SettingRow label="Dashboard Port" description="Port for the portctl web UI">
                  <FieldInput
                    type="number"
                    value={config.settings.dashboardPort}
                    onChange={(v) => onUpdateSettings({ dashboardPort: parseInt(v, 10) })}
                    width="w-24"
                  />
                </SettingRow>
                <SettingRow label="Polling Interval" description="How often to check for processes (ms)">
                  <FieldInput
                    type="number"
                    value={config.settings.pollingInterval}
                    onChange={(v) => onUpdateSettings({ pollingInterval: parseInt(v, 10) })}
                    step="100"
                    min="500"
                    width="w-24"
                  />
                </SettingRow>
                <SettingRow label="Default View" description="Initial view mode when opening portctl">
                  <FieldSelect
                    value={config.settings.defaultView}
                    onChange={(v) => onUpdateSettings({ defaultView: v as 'card' | 'table' })}
                    options={[{ value: 'card', label: 'Cards' }, { value: 'table', label: 'Table' }]}
                  />
                </SettingRow>
                <SettingRow label="Theme" description="Dashboard color scheme">
                  <FieldSelect
                    value={config.settings.theme}
                    onChange={(v) => onUpdateSettings({ theme: v as 'dark' | 'light' })}
                    options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
                  />
                </SettingRow>
                <SettingRow label="Card Click" description="Action when clicking a process card">
                  <FieldSelect
                    value={config.settings.cardClickBehavior}
                    onChange={(v) => onUpdateSettings({ cardClickBehavior: v as 'openBrowser' | 'openLogs' })}
                    options={[
                      { value: 'openBrowser', label: 'Open in Browser' },
                      { value: 'openLogs',    label: 'View Logs' },
                    ]}
                  />
                </SettingRow>
                <SettingRow label="Log Buffer" description="Maximum log lines stored per process">
                  <FieldInput
                    type="number"
                    value={config.settings.logBufferSize}
                    onChange={(v) => onUpdateSettings({ logBufferSize: parseInt(v, 10) })}
                    step="1000"
                    min="100"
                    width="w-24"
                  />
                </SettingRow>
              </div>
            )}

            {tab === 'reservations' && (
              <div className="space-y-2">
                {config.reservations.length === 0 ? (
                  <EmptyState message='No reservations yet. Use "Reserve Port" on any process card to create one.' />
                ) : (
                  config.reservations.map((r) => (
                    <div
                      key={r.port}
                      className="bg-surface-800/60 border border-white/[0.06] rounded-xl p-3.5 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold text-surface-100 font-sans">
                          :{r.port}
                          <span className="font-normal text-surface-400 ml-2">{r.label || 'Unnamed'}</span>
                        </div>
                        <div className="text-[11px] text-surface-500 mt-0.5 font-mono">
                          {r.matcher.type}: {r.matcher.value}
                        </div>
                        {r.restartTemplate && (
                          <div className="text-[11px] text-surface-600 mt-0.5 font-mono">{r.restartTemplate}</div>
                        )}
                      </div>
                      <button
                        className="text-[11px] text-red-400/70 hover:text-red-400 font-mono px-2 py-1 rounded-lg hover:bg-red-500/10 transition"
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
              <div className="space-y-2">
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    value={newBlockedPort}
                    onChange={(e) => setNewBlockedPort(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const port = parseInt(newBlockedPort, 10);
                        if (port >= 1 && port <= 65535) {
                          onAddBlockedPort(port);
                          setNewBlockedPort('');
                        }
                      }
                    }}
                    placeholder="Port number"
                    className="bg-surface-800 border border-white/[0.08] text-surface-200 text-sm px-3 py-2 rounded-lg w-36 font-mono focus:outline-none focus:border-indigo-500/50"
                    min={1}
                    max={65535}
                  />
                  <button
                    className="text-[12px] bg-surface-700 hover:bg-surface-600 text-surface-200 px-4 py-2 rounded-lg font-mono transition border border-white/[0.06]"
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
                {config.blockedPorts.length === 0 && <EmptyState message="No blocked ports." />}
                {config.blockedPorts.map((port) => (
                  <div
                    key={port}
                    className="bg-surface-800/60 border border-white/[0.06] rounded-xl p-3 flex items-center justify-between"
                  >
                    <span className="text-sm font-mono text-surface-200">:{port}</span>
                    <button
                      className="text-[11px] text-red-400/70 hover:text-red-400 font-mono px-2 py-1 rounded-lg hover:bg-red-500/10 transition"
                      onClick={() => onRemoveBlockedPort(port)}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'pinned' && (
              <div className="space-y-2">
                {config.pinnedPorts.length === 0 && <EmptyState message="No pinned ports. Pin process cards to keep them at the top." />}
                {config.pinnedPorts.map((port) => (
                  <div
                    key={port}
                    className="bg-surface-800/60 border border-white/[0.06] rounded-xl p-3 flex items-center justify-between"
                  >
                    <span className="text-sm font-mono text-surface-200">:{port}</span>
                    <button
                      className="text-[11px] text-amber-400/70 hover:text-amber-400 font-mono px-2 py-1 rounded-lg hover:bg-amber-500/10 transition"
                      onClick={() => onTogglePin(port)}
                    >
                      Unpin
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'about' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-surface-100 font-sans">portctl</h3>
                  <p className="text-xs text-surface-500 mt-1 font-mono">v1.0.0</p>
                </div>
                <p className="text-sm text-surface-400 font-sans leading-relaxed">
                  A local macOS dashboard for discovering and managing processes listening on network ports.
                </p>
                <a
                  href="https://github.com/august-andersen/portctl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition font-mono"
                >
                  GitHub Repository →
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
    <div className="flex items-center justify-between py-3 border-b border-white/[0.04]">
      <div>
        <div className="text-sm font-medium text-surface-200 font-sans">{label}</div>
        <div className="text-[11px] text-surface-500 mt-0.5 font-sans">{description}</div>
      </div>
      {children}
    </div>
  );
}

function FieldInput({
  type,
  value,
  onChange,
  step,
  min,
  width = 'w-32',
}: {
  type: string;
  value: string | number;
  onChange: (v: string) => void;
  step?: string;
  min?: string;
  width?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      step={step}
      min={min}
      className={`${width} bg-surface-800 border border-white/[0.08] text-surface-200 text-sm px-3 py-1.5 rounded-lg font-mono focus:outline-none focus:border-indigo-500/50 transition-colors`}
    />
  );
}

function FieldSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-surface-800 border border-white/[0.08] text-surface-200 text-sm px-3 py-1.5 rounded-lg font-sans focus:outline-none focus:border-indigo-500/50 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-surface-600 italic font-sans py-4">{message}</p>
  );
}
