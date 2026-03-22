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
  showSystem: boolean;
  onToggleSystem: () => void;
  hiddenCount: number;
  showHidden: boolean;
  onToggleHidden: () => void;
}

export default function Header({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  theme,
  onThemeToggle,
  onOpenSettings,
  showSystem,
  onToggleSystem,
  hiddenCount,
  showHidden,
  onToggleHidden,
}: HeaderProps) {
  return (
    <header className="bg-surface-900 border-b border-surface-700/50 px-6 py-3 flex items-center gap-4 sticky top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <span className="text-lg font-mono font-bold text-indigo-400">&#9653;</span>
        <span className="text-base font-bold text-surface-200 tracking-wide">portctl</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, port, tag..."
          className="w-full bg-surface-800 border border-surface-700/50 text-surface-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500/50 placeholder:text-surface-600 font-mono"
        />
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        {/* System processes filter */}
        <button
          className={`text-[11px] px-2.5 py-1.5 rounded-lg transition font-mono ${
            showSystem
              ? 'bg-surface-700 text-surface-300'
              : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800'
          }`}
          onClick={onToggleSystem}
          title={showSystem ? 'Hide system processes' : 'Show system processes'}
        >
          {showSystem ? 'Sys ON' : 'Sys OFF'}
        </button>

        {/* Hidden processes toggle */}
        {hiddenCount > 0 && (
          <button
            className={`text-[11px] px-2.5 py-1.5 rounded-lg transition font-mono ${
              showHidden
                ? 'bg-surface-700 text-surface-300'
                : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800'
            }`}
            onClick={onToggleHidden}
          >
            {hiddenCount} hidden
          </button>
        )}

        {/* View toggle */}
        <div className="flex bg-surface-800 rounded-lg border border-surface-700/50 overflow-hidden">
          <button
            className={`text-[11px] px-2.5 py-1.5 transition font-mono ${
              viewMode === 'card'
                ? 'bg-indigo-600 text-white'
                : 'text-surface-500 hover:text-surface-300'
            }`}
            onClick={() => onViewModeChange('card')}
          >
            Cards
          </button>
          <button
            className={`text-[11px] px-2.5 py-1.5 transition font-mono ${
              viewMode === 'table'
                ? 'bg-indigo-600 text-white'
                : 'text-surface-500 hover:text-surface-300'
            }`}
            onClick={() => onViewModeChange('table')}
          >
            Table
          </button>
        </div>

        {/* Theme toggle */}
        <button
          className="text-surface-500 hover:text-surface-300 px-2 py-1.5 rounded-lg hover:bg-surface-800 transition text-sm"
          onClick={onThemeToggle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '\u263C' : '\u263D'}
        </button>

        {/* Settings */}
        <button
          className="text-surface-500 hover:text-surface-300 px-2 py-1.5 rounded-lg hover:bg-surface-800 transition text-sm"
          onClick={onOpenSettings}
          title="Settings"
        >
          &#9881;
        </button>
      </div>
    </header>
  );
}
