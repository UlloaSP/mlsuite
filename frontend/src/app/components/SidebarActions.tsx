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
import { useEffect, useEffectEvent } from "react";
import { fullscreenAtom, globalSearchOpenAtom, themeWithHtmlAtom } from "../atoms";
import { isModShortcut, isTypingTarget } from "../utils/keyboard-shortcuts";
import { Kbd, KbdGroup } from "./Kbd";
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

const restoreRouteTransition = (element: HTMLElement, previousValue: string) => {
  if (previousValue) {
    element.style.viewTransitionName = previousValue;
  } else {
    element.style.removeProperty("view-transition-name");
  }
};

const modifierLabel = /mac/i.test(navigator.platform) ? "⌘" : "Ctrl";

export function SidebarActions() {
  const [theme, setTheme] = useAtom(themeWithHtmlAtom);
  const [isFullscreen, setIsFullscreen] = useAtom(fullscreenAtom);
  const [searchOpen, setSearchOpen] = useAtom(globalSearchOpenAtom);
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
  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    const transitionDocument = document as ViewTransitionDocument;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!transitionDocument.startViewTransition || reduceMotion) {
      setTheme(nextTheme);
      return;
    }

    const root = document.documentElement;
    const content = document.querySelector<HTMLElement>(".app-content-transition");
    const previousContentTransition = content?.style.viewTransitionName ?? "";
    if (content) content.style.viewTransitionName = "none";

    root.classList.add("theme-corner-transition");
    const transition = transitionDocument.startViewTransition(() => setTheme(nextTheme));
    void transition.finished.finally(() => {
      window.setTimeout(() => {
        root.classList.remove("theme-corner-transition");
        if (content) restoreRouteTransition(content, previousContentTransition);
      }, 120);
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
                <KbdGroup className="ml-auto">
                  <Kbd>{modifierLabel}</Kbd>
                  <Kbd>K</Kbd>
                </KbdGroup>
              ) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-keyshortcuts="Control+Shift+L Meta+Shift+L"
              title={theme === "light" ? "Dark Mode" : "Light Mode"}
              onClick={toggleTheme}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              <SidebarLabel className="truncate">
                {theme === "light" ? "Dark Mode" : "Light Mode"}
              </SidebarLabel>
              {!collapsed ? (
                <KbdGroup className="ml-auto">
                  <Kbd>{modifierLabel}</Kbd>
                  <Kbd>Shift</Kbd>
                  <Kbd>L</Kbd>
                </KbdGroup>
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
                <KbdGroup className="ml-auto">
                  <Kbd>{modifierLabel}</Kbd>
                  <Kbd>Shift</Kbd>
                  <Kbd>F</Kbd>
                </KbdGroup>
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
                <KbdGroup className="ml-auto">
                  <Kbd>{modifierLabel}</Kbd>
                  <Kbd>B</Kbd>
                </KbdGroup>
              ) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
