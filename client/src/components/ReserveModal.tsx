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
    // Auto-populate: extract a reasonable substring from the command
    const cmd = proc.command;
    // Try to find a distinctive part of the command (not just "node" or "python")
    const parts = cmd.split(/\s+/);
    if (parts.length > 1) {
      // Use the script/file name or a distinctive flag
      return parts.slice(0, 3).join(' ');
    }
    return cmd;
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-surface-200 mb-4">Reserve Port</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-surface-200/50 block mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="text-xs text-surface-200/50 block mb-1">Reserve for Port</label>
            <input
              type="number"
              value={targetPort}
              onChange={(e) => setTargetPort(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-2 rounded"
              min={1}
              max={65535}
            />
          </div>

          <div>
            <label className="text-xs text-surface-200/50 block mb-1">Matcher Type</label>
            <select
              value={matcherType}
              onChange={(e) => setMatcherType(e.target.value as MatcherType)}
              className="w-full bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-2 rounded"
            >
              <option value="command_contains">Command Contains</option>
              <option value="process_name">Process Name (exact)</option>
              <option value="working_directory">Working Directory</option>
              <option value="regex">Regex</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-surface-200/50 block mb-1">Matcher Value</label>
            <input
              type="text"
              value={matcherValue}
              onChange={(e) => setMatcherValue(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-2 rounded font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs text-surface-200/50 block mb-1">
              Custom Restart Command <span className="text-surface-200/30">(optional, use {'{{PORT}}'} placeholder)</span>
            </label>
            <input
              type="text"
              value={restartTemplate}
              onChange={(e) => setRestartTemplate(e.target.value)}
              placeholder="cd ~/project && npm run dev -- --port {{PORT}}"
              className="w-full bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-2 rounded font-mono text-xs placeholder:text-surface-200/20"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6 justify-end">
          <button
            className="text-sm bg-surface-700 text-surface-200 hover:bg-surface-200/20 px-4 py-2 rounded-lg"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            onClick={handleSubmit}
          >
            Reserve
          </button>
        </div>
      </div>
    </div>
  );
}
