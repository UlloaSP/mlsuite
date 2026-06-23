/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Dialog } from "radix-ui";
import { type ComponentProps } from "react";
import { cx } from "../cx";
import { useSidebar } from "./SidebarContext";

type SidebarProps = ComponentProps<"aside"> & {
  side?: "left" | "right";
};

export function Sidebar({ children, className, side = "left", ...props }: SidebarProps) {
  const { isMobile, openMobile, setOpenMobile, state } = useSidebar();
  const sideClass = side === "left" ? "left-0 border-r" : "right-0 border-l";

  if (isMobile) {
    return (
      <Dialog.Root open={openMobile} onOpenChange={setOpenMobile}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" />
          <Dialog.Content
            aria-label="Application sidebar"
            className={cx(
              "fixed bottom-0 top-0 z-50 w-[min(20rem,calc(100vw-2rem))] border-[var(--border-soft)] bg-[var(--sidebar-bg)] shadow-[var(--shadow-hover)] backdrop-blur-xl",
              sideClass,
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
      data-state={state}
      className={cx(
        "hidden h-screen shrink-0 overflow-hidden border-[var(--border-soft)] bg-[var(--sidebar-bg)] text-[var(--text-primary)] backdrop-blur-xl transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] xl:block",
        state === "collapsed" ? "w-[4.25rem]" : "w-[17rem]",
        side === "left" ? "border-r" : "border-l",
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}
