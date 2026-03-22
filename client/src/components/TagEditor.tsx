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

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = () => {
    onSave(`port:${proc.port}`, tags);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold text-surface-200 mb-4">
          Edit Tags — :{proc.port}
        </h3>

        <div className="flex flex-wrap gap-1.5 mb-4 min-h-[32px]">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-surface-700 text-surface-200/70 text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
            >
              {tag}
              <button
                className="text-surface-200/40 hover:text-red-400 ml-0.5"
                onClick={() => removeTag(tag)}
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="Add tag..."
            className="flex-1 bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-2 rounded focus:outline-none focus:border-blue-500 placeholder:text-surface-200/30"
            autoFocus
          />
          <button
            className="text-sm bg-surface-700 text-surface-200 hover:bg-surface-200/20 px-3 py-2 rounded"
            onClick={addTag}
          >
            Add
          </button>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            className="text-sm bg-surface-700 text-surface-200 hover:bg-surface-200/20 px-4 py-2 rounded-lg"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
