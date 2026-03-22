import React, { useRef, useEffect, useState, useCallback } from 'react';

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** The trigger element — popover positions relative to this */
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  /** Horizontal alignment */
  align?: 'left' | 'right';
  className?: string;
}

/**
 * A popover that:
 * 1. Closes when clicking outside
 * 2. Positions above the anchor by default, flips below if not enough space
 * 3. Stays within viewport horizontally
 */
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
  const [placement, setPlacement] = useState<'above' | 'below'>('above');

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const gap = 4;

    // Decide vertical placement
    const spaceAbove = anchorRect.top;
    const spaceBelow = viewportHeight - anchorRect.bottom;
    const fitsAbove = spaceAbove >= popoverRect.height + gap;
    const useAbove = fitsAbove || spaceAbove > spaceBelow;

    let top: number;
    if (useAbove) {
      top = anchorRect.top - popoverRect.height - gap;
      setPlacement('above');
    } else {
      top = anchorRect.bottom + gap;
      setPlacement('below');
    }

    // Clamp vertical to viewport
    top = Math.max(4, Math.min(top, viewportHeight - popoverRect.height - 4));

    // Horizontal alignment
    let left: number;
    if (align === 'right') {
      left = anchorRect.right - popoverRect.width;
    } else {
      left = anchorRect.left;
    }

    // Clamp horizontal to viewport
    left = Math.max(4, Math.min(left, viewportWidth - popoverRect.width - 4));

    setPosition({ top, left });
  }, [anchorRef, align]);

  // Position on open and on scroll/resize
  useEffect(() => {
    if (!open) return;

    // Use rAF to wait for the popover to render so we can measure it
    const frame = requestAnimationFrame(updatePosition);

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent) => {
      const popover = popoverRef.current;
      const anchor = anchorRef.current;
      if (!popover || !anchor) return;

      if (
        !popover.contains(e.target as Node) &&
        !anchor.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    // Delay to avoid the opening click from immediately closing
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handler);
    };
  }, [open, onClose, anchorRef]);

  // Close on Escape
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
      className={`fixed z-50 bg-surface-900 border border-surface-700 rounded-lg shadow-2xl ${className}`}
      style={{ top: position.top, left: position.left, width: 'fit-content' }}
    >
      {children}
    </div>
  );
}
