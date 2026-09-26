/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Dialog } from "radix-ui";
import { type ComponentProps } from "react";
import type { SidebarPosition, SidebarStyle } from "@/shared/ui/sidebar-preferences";
import { cx } from "@/shared/ui/cx";
import { useSidebar } from "./SidebarContext";

type SidebarProps = ComponentProps<"aside"> & {
  side?: SidebarPosition;
  variant?: SidebarStyle;
};

export function Sidebar({
  children,
  className,
  side = "left",
  variant = "fixed",
  ...props
}: SidebarProps) {
  const { isMobile, openMobile, setOpenMobile, state } = useSidebar();
  const floating = variant === "floating";
  // Floating insets the panel from every viewport edge so the page background frames it.
  const drawerEdge = floating
    ? cx("top-2 bottom-2 rounded-2xl border", side === "left" ? "left-2" : "right-2")
    : cx("top-0 bottom-0", side === "left" ? "left-0 border-r" : "right-0 border-l");
  // Collapsed, the floating panel hugs its icons and centers vertically instead of stretching.
  const panelEdge = floating
    ? cx(
        "my-2 max-h-[calc(100dvh-1rem)] self-center rounded-2xl border shadow-card",
        state === "collapsed" ? "h-auto" : "h-[calc(100dvh-1rem)]",
        side === "left" ? "ml-2" : "mr-2",
      )
    : cx("h-screen", side === "left" ? "border-r" : "border-l");

  if (isMobile) {
    return (
      <Dialog.Root open={openMobile} onOpenChange={setOpenMobile}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-[2px]" />
          <Dialog.Content
            aria-label="Application sidebar"
            data-side={side}
            data-variant={variant}
            className={cx(
              "fixed z-(--z-drawer) flex w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden border-line bg-sidebar shadow-hover backdrop-blur-xl",
              drawerEdge,
              className,
            )}
          >
            {children}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <aside
      data-app-sidebar
      data-side={side}
      data-state={state}
      data-variant={variant}
      className={cx(
        "hidden shrink-0 overflow-hidden border-line bg-sidebar text-fg backdrop-blur-xl transition-[width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] [interpolate-size:allow-keywords] xl:flex xl:flex-col",
        state === "collapsed" ? "w-[4.25rem]" : "w-[17rem]",
        panelEdge,
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}
