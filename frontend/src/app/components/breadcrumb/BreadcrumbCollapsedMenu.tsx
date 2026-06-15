/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { FOCUS_RING } from "../focus-ring";
import { cx } from "../cx";
import { BreadcrumbEllipsis } from "./BreadcrumbEllipsis";

export type BreadcrumbCollapsedMenuItem = {
  label: ReactNode;
  to?: string;
};

export function BreadcrumbCollapsedMenu({ items }: { items: BreadcrumbCollapsedMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const updateMenuPosition = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPosition({
      left: Math.max(8, rect.left),
      top: rect.bottom + 8,
    });
  };

  useEffect(() => {
    const closeFromOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", closeFromOutside);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("pointerdown", closeFromOutside);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (open) {
      updateMenuPosition();
    }
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-50">
      <button
        type="button"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className={cx(
          FOCUS_RING,
          "inline-flex size-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
        )}
      >
        <BreadcrumbEllipsis />
        <span className="sr-only">Toggle breadcrumb menu</span>
      </button>
      {open
        ? createPortal(
            <div
              id={menuId}
              ref={menuRef}
              role="menu"
              style={{ left: menuPosition.left, top: menuPosition.top }}
              className="fixed z-[9999] min-w-[168px] rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
            >
              {items.map((item, index) =>
                item.to ? (
                  <Link
                    key={`${index}-${item.to}`}
                    to={item.to}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2.5 py-1.5 text-[13px] font-medium leading-5 text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)] focus:outline-none"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    key={`${index}-${String(item.label)}`}
                    role="menuitem"
                    className="block rounded-md px-2.5 py-1.5 text-[13px] font-medium leading-5 text-[var(--text-primary)]"
                  >
                    {item.label}
                  </span>
                ),
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
