/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect } from "react";
import { useSidebar } from "@/app/components/app-sidebar/SidebarContext";
import { destroyUserGuide, startUserGuide } from "./user-guide";

/** Starts the tour from a trigger, expanding a collapsed desktop sidebar for its duration. */
export function useUserGuideLauncher(expandsSidebar: boolean) {
  const { isMobile, setOpen, state } = useSidebar();

  useEffect(() => destroyUserGuide, []);

  return (trigger: HTMLElement) => {
    const restoreCollapsed = expandsSidebar && !isMobile && state === "collapsed";
    if (restoreCollapsed) setOpen(true);

    requestAnimationFrame(() => {
      void startUserGuide({
        trigger,
        onDestroyed: () => {
          if (restoreCollapsed) setOpen(false);
        },
      });
    });
  };
}
