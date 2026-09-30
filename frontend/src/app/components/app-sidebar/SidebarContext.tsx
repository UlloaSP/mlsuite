/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  use,
  useMemo,
  useState,
} from "react";
import { useMediaQuery } from "@/shared/ui/use-media-query";
import { useShortcut } from "@/shared/ui/use-shortcut";

type SidebarContextValue = {
  collapsed: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: Dispatch<SetStateAction<boolean>>;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  children,
  open,
  onOpenChange,
}: PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const [openMobile, setOpenMobile] = useState(false);
  const isMobile = useMediaQuery("(max-width: 1279px)");

  const value = useMemo<SidebarContextValue>(
    () => ({
      collapsed: !open,
      setOpen: onOpenChange,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar: () => {
        if (isMobile) {
          setOpenMobile((next) => !next);
        } else {
          onOpenChange(!open);
        }
      },
    }),
    [isMobile, onOpenChange, open, openMobile],
  );
  useShortcut("toggle-sidebar", value.toggleSidebar);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = use(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}
