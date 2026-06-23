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
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";

type SidebarContextValue = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: Dispatch<SetStateAction<boolean>>;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);
const MOBILE_QUERY = "(max-width: 1279px)";
const isMobileViewport = () => window.matchMedia(MOBILE_QUERY).matches;

export function SidebarProvider({
  children,
  open,
  onOpenChange,
}: PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const [openMobile, setOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  const toggleFromShortcut = useEffectEvent(() => {
    if (isMobileViewport()) {
      setOpenMobile((value) => !value);
    } else {
      onOpenChange(!open);
    }
  });

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleFromShortcut();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({
      state: open ? "expanded" : "collapsed",
      open,
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

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = use(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}
