import React from 'react';
import type { ViewMode, Theme } from '@shared/types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  theme: Theme;
  onThemeToggle: () => void;
  onOpenSettings: () => void;
}

export default function Header({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  theme,
  onThemeToggle,
  onOpenSettings,
}: HeaderProps) {
  return (
    <header className="bg-surface-900 border-b border-surface-700 px-6 py-3 flex items-center gap-4 sticky top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <span className="text-xl font-bold text-blue-400">&#9653;</span>
        <span className="text-lg font-bold text-surface-200">portctl</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, port, tag..."
          className="w-full bg-surface-800 border border-surface-700 text-surface-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 placeholder:text-surface-200/30"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* View toggle */}
        <div className="flex bg-surface-800 rounded-lg border border-surface-700 overflow-hidden">
          <button
            className={`text-xs px-3 py-2 transition ${
              viewMode === 'card'
                ? 'bg-blue-600 text-white'
                : 'text-surface-200/50 hover:text-surface-200'
            }`}
            onClick={() => onViewModeChange('card')}
          >
            Cards
          </button>
          <button
            className={`text-xs px-3 py-2 transition ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white'
                : 'text-surface-200/50 hover:text-surface-200'
            }`}
            onClick={() => onViewModeChange('table')}
          >
            Table
          </button>
        </div>

        {/* Theme toggle */}
        <button
          className="text-surface-200/50 hover:text-surface-200 px-2 py-2 rounded-lg hover:bg-surface-800 transition"
          onClick={onThemeToggle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '\u2600' : '\u263D'}
        </button>

        {/* Settings */}
        <button
          className="text-surface-200/50 hover:text-surface-200 px-2 py-2 rounded-lg hover:bg-surface-800 transition"
          onClick={onOpenSettings}
          title="Settings"
        >
          &#9881;
        </button>
      </div>
    </header>
  );
}
