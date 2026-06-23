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
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { fullscreenAtom, globalSearchOpenAtom, themeWithHtmlAtom } from "../atoms";
import { isModShortcut, isTypingTarget } from "../utils/keyboard-shortcuts";
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

const modifierLabel = /mac/i.test(navigator.platform) ? "⌘" : "Ctrl";

export function SidebarActions() {
  const [theme, setTheme] = useAtom(themeWithHtmlAtom);
  const [isFullscreen, setIsFullscreen] = useAtom(fullscreenAtom);
  const [searchOpen, setSearchOpen] = useAtom(globalSearchOpenAtom);
  const [themeTransitioning, setThemeTransitioning] = useState(false);
  const themeTransitioningRef = useRef(false);
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const collapseLabel = collapsed ? "Expand" : "Collapse";
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      void document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };
  const toggleTheme = (target?: HTMLElement | null) => {
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

    const rect = target?.getBoundingClientRect();
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;
    const left = rect?.left ?? window.innerWidth / 2;
    const top = rect?.top ?? window.innerHeight / 2;
    const x = left + width / 2;
    const y = top + height / 2;
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
  const handleWindowKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return;

    if (isModShortcut(event, "l", true)) {
      event.preventDefault();
      toggleTheme();
    }

    if (isModShortcut(event, "f", true)) {
      event.preventDefault();
      toggleFullscreen();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, []);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Actions</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-keyshortcuts="Control+K Meta+K"
              title="Global Search"
              isActive={searchOpen}
              onClick={() => setSearchOpen(true)}
            >
              <Search size={18} />
              <SidebarLabel className="truncate">Global Search</SidebarLabel>
              {!collapsed ? (
                <span className="ml-auto text-[0.68rem] font-semibold text-[var(--text-muted)]">
                  {modifierLabel} K
                </span>
              ) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-keyshortcuts="Control+Shift+L Meta+Shift+L"
              title={theme === "light" ? "Dark Mode" : "Light Mode"}
              disabled={themeTransitioning}
              onClick={(event: MouseEvent<HTMLButtonElement>) => toggleTheme(event.currentTarget)}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              <SidebarLabel className="truncate">
                {theme === "light" ? "Dark Mode" : "Light Mode"}
              </SidebarLabel>
              {!collapsed ? (
                <span className="ml-auto text-[0.68rem] font-semibold text-[var(--text-muted)]">
                  {modifierLabel} Shift L
                </span>
              ) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-keyshortcuts="Control+Shift+F Meta+Shift+F"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              <SidebarLabel className="truncate">
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </SidebarLabel>
              {!collapsed ? (
                <span className="ml-auto text-[0.68rem] font-semibold text-[var(--text-muted)]">
                  {modifierLabel} Shift F
                </span>
              ) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-keyshortcuts="Control+B Meta+B"
              title={collapseLabel}
              aria-expanded={!collapsed}
              onClick={toggleSidebar}
            >
              {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
              <SidebarLabel className="truncate">{collapseLabel}</SidebarLabel>
              {!collapsed ? (
                <span className="ml-auto text-[0.68rem] font-semibold text-[var(--text-muted)]">
                  {modifierLabel} B
                </span>
              ) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
