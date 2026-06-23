/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  Maximize,
  Minimize,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Sun,
} from "lucide-react";
import { useAtom } from "jotai";
import type { MouseEvent } from "react";
import { useRef, useState } from "react";
import { fullscreenAtom, globalSearchOpenAtom, themeWithHtmlAtom } from "../atoms";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./app-sidebar";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

export function SidebarActions() {
  const [theme, setTheme] = useAtom(themeWithHtmlAtom);
  const [isFullscreen, setIsFullscreen] = useAtom(fullscreenAtom);
  const [searchOpen, setSearchOpen] = useAtom(globalSearchOpenAtom);
  const [themeTransitioning, setThemeTransitioning] = useState(false);
  const themeTransitioningRef = useRef(false);
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const collapseLabel = collapsed ? "Expand" : "Collapse";
  const toggleTheme = (event: MouseEvent<HTMLButtonElement>) => {
    if (themeTransitioningRef.current) {
      return;
    }

    const nextTheme = theme === "light" ? "dark" : "light";
    const transitionDocument = document as ViewTransitionDocument;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!transitionDocument.startViewTransition || reduceMotion) {
      setTheme(nextTheme);
      return;
    }

    themeTransitioningRef.current = true;
    setThemeTransitioning(true);

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    const root = document.documentElement;

    root.style.setProperty("--theme-transition-x", `${x}px`);
    root.style.setProperty("--theme-transition-y", `${y}px`);
    root.style.setProperty("--theme-transition-radius", `${endRadius}px`);
    root.classList.add("theme-radial-transition");

    const transition = transitionDocument.startViewTransition(() => setTheme(nextTheme));
    void transition.finished.finally(() => {
      themeTransitioningRef.current = false;
      setThemeTransitioning(false);
      root.classList.remove("theme-radial-transition");
      root.style.removeProperty("--theme-transition-x");
      root.style.removeProperty("--theme-transition-y");
      root.style.removeProperty("--theme-transition-radius");
    });
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Actions</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              title="Global Search"
              isActive={searchOpen}
              onClick={() => setSearchOpen(true)}
            >
              <Search size={18} />
              <SidebarLabel className="truncate">Global Search</SidebarLabel>
              <SidebarLabel className="ml-auto text-[0.68rem] font-semibold text-[var(--text-muted)]">
                Ctrl K
              </SidebarLabel>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              title={theme === "light" ? "Dark Mode" : "Light Mode"}
              disabled={themeTransitioning}
              onClick={toggleTheme}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              <SidebarLabel className="truncate">
                {theme === "light" ? "Dark Mode" : "Light Mode"}
              </SidebarLabel>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              onClick={() => {
                if (!document.fullscreenElement) {
                  void document.documentElement
                    .requestFullscreen()
                    .then(() => setIsFullscreen(true));
                } else {
                  void document.exitFullscreen().then(() => setIsFullscreen(false));
                }
              }}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              <SidebarLabel className="truncate">
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </SidebarLabel>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              title={collapseLabel}
              aria-expanded={!collapsed}
              onClick={toggleSidebar}
            >
              {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
              <SidebarLabel className="truncate">{collapseLabel}</SidebarLabel>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
