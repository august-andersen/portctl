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

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0">
    <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
    <path d="m8.5 8.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="8" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="1" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="8" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.9 2.9l1.07 1.07M11.03 11.03l1.07 1.07M2.9 12.1l1.07-1.07M11.03 3.97l1.07-1.07" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M12 8.5A5.5 5.5 0 0 1 6.5 3c0-.7.1-1.37.29-2A5.5 5.5 0 1 0 14 10.21 5.47 5.47 0 0 1 12 8.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

const GearIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M7.5 1v1M7.5 13v1M1 7.5h1M13 7.5h1M2.64 2.64l.7.7M11.66 11.66l.7.7M2.64 12.36l.7-.7M11.66 3.34l.7-.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

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
    <header className="glass-header border-b border-white/[0.055] px-5 py-3 flex items-center gap-3 sticky top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3 shrink-0">
        <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M2 9V5l3.5-4L9 5v4" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M4 9V7h3v2" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-surface-100 tracking-tight">portctl</span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-800 border border-white/[0.07] rounded-lg px-3 py-2 flex-1 max-w-xs focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/15 transition-all">
        <span className="text-surface-500">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search ports, names, tags…"
          className="bg-transparent text-surface-200 text-xs w-full focus:outline-none placeholder:text-surface-500 font-mono"
        />
        {searchQuery && (
          <button
            className="text-surface-500 hover:text-surface-300 transition"
            onClick={() => onSearchChange('')}
          >
            ×
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        {/* System toggle */}
        <button
          className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg transition font-mono ${
            showSystem
              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
              : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800 border border-transparent'
          }`}
          onClick={onToggleSystem}
          title={showSystem ? 'Hide system processes' : 'Show system processes'}
        >
          Sys
        </button>

        {/* Hidden processes */}
        {hiddenCount > 0 && (
          <button
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg transition font-mono ${
              showHidden
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800 border border-transparent'
            }`}
            onClick={onToggleHidden}
            title={showHidden ? 'Hide hidden processes' : 'Show hidden processes'}
          >
            <EyeIcon />
            {hiddenCount}
          </button>
        )}

        {/* Separator */}
        <div className="w-px h-5 bg-white/[0.07] mx-0.5" />

        {/* View toggle */}
        <div className="flex bg-surface-800 border border-white/[0.07] rounded-lg overflow-hidden p-0.5 gap-0.5">
          <button
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md transition font-mono ${
              viewMode === 'card'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-surface-500 hover:text-surface-300'
            }`}
            onClick={() => onViewModeChange('card')}
            title="Card view"
          >
            <GridIcon />
            <span>Cards</span>
          </button>
          <button
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md transition font-mono ${
              viewMode === 'table'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-surface-500 hover:text-surface-300'
            }`}
            onClick={() => onViewModeChange('table')}
            title="Table view"
          >
            <ListIcon />
            <span>Table</span>
          </button>
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-white/[0.07] mx-0.5" />

        {/* Theme toggle */}
        <button
          className="text-surface-400 hover:text-surface-200 p-2 rounded-lg hover:bg-surface-800 transition"
          onClick={onThemeToggle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Settings */}
        <button
          className="text-surface-400 hover:text-surface-200 p-2 rounded-lg hover:bg-surface-800 transition"
          onClick={onOpenSettings}
          title="Settings"
        >
          <GearIcon />
        </button>
      </div>
    </header>
  );
}
