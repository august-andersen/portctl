import React, { useState } from 'react';
import type { PortProcess, Reservation, MatcherType } from '@shared/types';

interface ReserveModalProps {
  process: PortProcess;
  onReserve: (reservation: Reservation) => void;
  onClose: () => void;
}

export default function ReserveModal({ process: proc, onReserve, onClose }: ReserveModalProps) {
  const [matcherType, setMatcherType] = useState<MatcherType>('command_contains');
  const [matcherValue, setMatcherValue] = useState(() => {
    const parts = proc.command.split(/\s+/);
    return parts.length > 1 ? parts.slice(0, 3).join(' ') : proc.command;
  });
  const [label, setLabel] = useState(proc.name);
  const [restartTemplate, setRestartTemplate] = useState('');
  const [targetPort, setTargetPort] = useState(String(proc.port));

  const handleSubmit = () => {
    const port = parseInt(targetPort, 10);
    if (port < 1 || port > 65535) return;
    onReserve({
      port,
      matcher: { type: matcherType, value: matcherValue },
      restartTemplate: restartTemplate || null,
      label,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <div className="bg-surface-900 border border-white/[0.08] rounded-2xl shadow-2xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-surface-100 font-sans">Reserve Port</h3>
            <p className="text-[11px] text-surface-500 mt-0.5 font-mono">:{proc.port} · {proc.name}</p>
          </div>
          <button
            className="text-surface-500 hover:text-surface-200 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition text-lg"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <FormField label="Label">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-surface-800 border border-white/[0.08] text-surface-200 text-sm px-3 py-2 rounded-lg font-sans focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </FormField>

          <FormField label="Reserve for Port">
            <input
              type="number"
              value={targetPort}
              onChange={(e) => setTargetPort(e.target.value)}
              className="w-full bg-surface-800 border border-white/[0.08] text-surface-200 text-sm px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-indigo-500/50 transition-colors"
              min={1}
              max={65535}
            />
          </FormField>

          <FormField label="Matcher Type">
            <select
              value={matcherType}
              onChange={(e) => setMatcherType(e.target.value as MatcherType)}
              className="w-full bg-surface-800 border border-white/[0.08] text-surface-200 text-sm px-3 py-2 rounded-lg font-sans focus:outline-none focus:border-indigo-500/50 transition-colors"
            >
              <option value="command_contains">Command Contains</option>
              <option value="process_name">Process Name (exact)</option>
              <option value="working_directory">Working Directory</option>
              <option value="regex">Regex</option>
            </select>
          </FormField>

          <FormField label="Matcher Value">
            <input
              type="text"
              value={matcherValue}
              onChange={(e) => setMatcherValue(e.target.value)}
              className="w-full bg-surface-800 border border-white/[0.08] text-surface-200 text-sm px-3 py-2 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </FormField>

          <FormField
            label="Restart Command"
            hint={<>Optional · use <code className="text-indigo-400 font-mono">{'{{PORT}}'}</code> placeholder</>}
          >
            <input
              type="text"
              value={restartTemplate}
              onChange={(e) => setRestartTemplate(e.target.value)}
              placeholder="cd ~/project && npm run dev -- --port {{PORT}}"
              className="w-full bg-surface-800 border border-white/[0.08] text-surface-200 text-sm px-3 py-2 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-surface-600"
            />
          </FormField>
        </div>

        <div className="flex gap-2 mt-6 justify-end">
          <button
            className="text-sm font-sans bg-surface-800 text-surface-300 hover:bg-surface-700 px-4 py-2 rounded-xl border border-white/[0.07] transition"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="text-sm font-sans bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-500/20"
            onClick={handleSubmit}
          >
            Reserve
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-medium text-surface-400 uppercase tracking-wide font-sans">{label}</label>
        {hint && <span className="text-[10px] text-surface-500 font-sans">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
