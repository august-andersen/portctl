import React from 'react';
import type { Toast as ToastType } from '@shared/types';

interface ToastProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

const typeStyles: Record<ToastType['type'], string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
};

const typeIcons: Record<ToastType['type'], string> = {
  success: '\u2713',
  error: '\u2717',
  info: '\u24D8',
};

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${typeStyles[toast.type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in cursor-pointer`}
          onClick={() => onDismiss(toast.id)}
        >
          <span className="text-lg font-bold">{typeIcons[toast.type]}</span>
          <span className="text-sm flex-1">{toast.message}</span>
          <button
            className="ml-2 opacity-70 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(toast.id);
            }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
