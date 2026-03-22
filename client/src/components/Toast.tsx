import React from 'react';
import type { Toast as ToastType } from '@shared/types';

interface ToastProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

const typeConfig: Record<ToastType['type'], { bg: string; border: string; icon: string; iconCls: string }> = {
  success: {
    bg: 'bg-surface-800/95',
    border: 'border-emerald-500/25',
    icon: '✓',
    iconCls: 'text-emerald-400 bg-emerald-500/15',
  },
  error: {
    bg: 'bg-surface-800/95',
    border: 'border-red-500/25',
    icon: '✕',
    iconCls: 'text-red-400 bg-red-500/15',
  },
  info: {
    bg: 'bg-surface-800/95',
    border: 'border-indigo-500/25',
    icon: 'i',
    iconCls: 'text-indigo-400 bg-indigo-500/15',
  },
};

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-xs">
      {toasts.map((toast) => {
        const cfg = typeConfig[toast.type];
        return (
          <div
            key={toast.id}
            className={`
              ${cfg.bg} ${cfg.border}
              border rounded-xl shadow-2xl shadow-black/40
              px-3.5 py-3 flex items-center gap-3
              animate-slide-in cursor-pointer
              backdrop-blur-md
            `}
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            onClick={() => onDismiss(toast.id)}
          >
            <span className={`${cfg.iconCls} w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0`}>
              {cfg.icon}
            </span>
            <span className="text-[13px] text-surface-200 flex-1 font-sans leading-snug">{toast.message}</span>
            <button
              className="text-surface-500 hover:text-surface-300 transition text-lg leading-none shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(toast.id);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
