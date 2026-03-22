import React, { useState } from 'react';
import type { PortProcess } from '@shared/types';

interface TagEditorProps {
  process: PortProcess;
  onSave: (key: string, tags: string[]) => void;
  onClose: () => void;
}

export default function TagEditor({ process: proc, onSave, onClose }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(proc.tags);
  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSave = () => {
    onSave(`port:${proc.port}`, tags);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <div className="bg-surface-900 border border-white/[0.08] rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-surface-100 font-sans">Edit Tags</h3>
            <p className="text-[11px] text-surface-500 mt-0.5 font-mono">:{proc.port} · {proc.name}</p>
          </div>
          <button
            className="text-surface-500 hover:text-surface-200 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition text-lg"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Current tags */}
        <div className="min-h-[40px] flex flex-wrap gap-1.5 mb-4 p-3 bg-surface-800/40 rounded-xl border border-white/[0.05]">
          {tags.length === 0 && (
            <span className="text-[11px] text-surface-600 italic font-sans self-center">No tags</span>
          )}
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 bg-surface-700/70 text-surface-300 text-[11px] px-2.5 py-1 rounded-full font-mono border border-white/[0.06]"
            >
              {tag}
              <button
                className="text-surface-500 hover:text-red-400 transition ml-0.5 text-xs leading-none"
                onClick={() => removeTag(tag)}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Add tag */}
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="Add tag…"
            className="flex-1 bg-surface-800 border border-white/[0.08] text-surface-200 text-sm px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-surface-600"
            autoFocus
          />
          <button
            className="text-sm font-sans bg-surface-700 text-surface-200 hover:bg-surface-600 px-3 py-2 rounded-lg border border-white/[0.06] transition"
            onClick={addTag}
          >
            Add
          </button>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            className="text-sm font-sans bg-surface-800 text-surface-300 hover:bg-surface-700 px-4 py-2 rounded-xl border border-white/[0.07] transition"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="text-sm font-sans bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-500/20"
            onClick={handleSave}
          >
            Save Tags
          </button>
        </div>
      </div>
    </div>
  );
}
