"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

export function DropdownMenuPortal({
  anchorRect,
  onClose,
  width = 224,
  children,
  onMouseEnter,
  onMouseLeave,
}: {
  anchorRect: DOMRect | null;
  onClose: () => void;
  width?: number;
  children: ReactNode;
  // Optional — lets a hover-opened menu (like the notification bell) stay
  // open while the pointer moves from the trigger button into the panel
  // itself, since the panel renders via a portal outside the trigger's
  // own DOM subtree so plain CSS/JS hover on the trigger alone can't see it.
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !anchorRect) {
    return null;
  }

  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const margin = 8;

  // How much room actually exists below vs above the button — a menu
  // with many items (some have a dozen+) can be taller than either, so
  // rather than guess a fixed height, open on whichever side has more
  // room and let the menu scroll internally if it still doesn't fit.
  const spaceBelow = viewportHeight - anchorRect.bottom - margin;
  const spaceAbove = anchorRect.top - margin;
  const opensUpward = spaceBelow < 200 && spaceAbove > spaceBelow;
  const availableSpace = Math.max(160, opensUpward ? spaceAbove : spaceBelow);
  const maxHeight = Math.min(availableSpace, viewportHeight - margin * 2);

  const left = Math.min(
    Math.max(8, anchorRect.right - width),
    viewportWidth - width - 8,
  );

  const style: CSSProperties = opensUpward
    ? { left, bottom: viewportHeight - anchorRect.top + margin, width, maxHeight }
    : { left, top: anchorRect.bottom + margin, width, maxHeight };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[200] cursor-default"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed z-[210] overflow-y-auto overscroll-contain rounded-xl border border-[#e2e8f0] bg-white py-2 text-left shadow-2xl"
        style={style}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
