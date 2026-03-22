import React, { useRef, useEffect, useState, useCallback } from 'react';

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export default function Popover({
  open,
  onClose,
  anchorRef,
  children,
  align = 'left',
  className = '',
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const gap = 6;

    const spaceAbove = anchorRect.top;
    const spaceBelow = viewportHeight - anchorRect.bottom;
    const fitsAbove = spaceAbove >= popoverRect.height + gap;
    const useAbove = fitsAbove || spaceAbove > spaceBelow;

    let top: number;
    if (useAbove) {
      top = anchorRect.top - popoverRect.height - gap;
    } else {
      top = anchorRect.bottom + gap;
    }

    top = Math.max(6, Math.min(top, viewportHeight - popoverRect.height - 6));

    let left: number;
    if (align === 'right') {
      left = anchorRect.right - popoverRect.width;
    } else {
      left = anchorRect.left;
    }

    left = Math.max(6, Math.min(left, viewportWidth - popoverRect.width - 6));

    setPosition({ top, left });
  }, [anchorRef, align]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const popover = popoverRef.current;
      const anchor = anchorRef.current;
      if (!popover || !anchor) return;
      if (!popover.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
        onClose();
      }
    };
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handler);
    };
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      className={`fixed z-50 bg-surface-900 border border-white/[0.1] rounded-xl shadow-2xl shadow-black/50 ${className}`}
      style={{ top: position.top, left: position.left, width: 'fit-content' }}
    >
      {children}
    </div>
  );
}
