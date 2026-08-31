/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  Maximize,
  Minimize,
  Monitor,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useEffectEvent } from "react";
import { Link } from "react-router";
import { nextThemeMode, themeModeAtom } from "@/shared/ui/appearance-state";
import { fullscreenAtom, globalSearchOpenAtom } from "@/shared/ui/ui-state";
import { isTypingTarget } from "@/app/utils/keyboard-shortcuts";
import { AppKbd } from "@/shared/ui/AppKbd";
import { AppKbdGroup } from "@/shared/ui/AppKbdGroup";
import {
  matchesShortcut,
  shortcutBindingsAtom,
  shortcutLabels,
  shortcutToAria,
  type ShortcutBinding,
} from "@/shared/ui/shortcut-state";
import { UserGuideButton } from "./UserGuideButton";
import { SidebarGroup } from "./app-sidebar/SidebarGroup";
import { SidebarGroupContent } from "./app-sidebar/SidebarGroupContent";
import { SidebarGroupLabel } from "./app-sidebar/SidebarGroupLabel";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { SidebarMenu } from "./app-sidebar/SidebarMenu";
import { SidebarMenuButton } from "./app-sidebar/SidebarMenuButton";
import { SidebarMenuItem } from "./app-sidebar/SidebarMenuItem";
import { useSidebar } from "./app-sidebar/SidebarContext";

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

const shortcutHint = (binding: ShortcutBinding) => (
  <AppKbdGroup className="ml-auto">
    {shortcutLabels(binding).map((label) => (
      <AppKbd key={label}>{label}</AppKbd>
    ))}
  </AppKbdGroup>
);

export function SidebarActions() {
  const [theme, setTheme] = useAtom(themeModeAtom);
  const [isFullscreen, setIsFullscreen] = useAtom(fullscreenAtom);
  const [searchOpen, setSearchOpen] = useAtom(globalSearchOpenAtom);
  const bindings = useAtomValue(shortcutBindingsAtom);
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const collapseLabel = collapsed ? "Expand" : "Collapse";
  const nextTheme = nextThemeMode(theme);
  const nextThemeLabel = `${nextTheme === "system" ? "System" : nextTheme === "light" ? "Light" : "Dark"} Mode`;
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      void document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };
  const toggleTheme = () => {
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

    if (matchesShortcut(event, bindings["toggle-theme"])) {
      event.preventDefault();
      toggleTheme();
    }

    if (matchesShortcut(event, bindings["toggle-fullscreen"])) {
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
      <SidebarGroupLabel>Tooling</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <UserGuideButton />
          <SidebarMenuItem>
            <SidebarMenuButton asChild title="Settings">
              <Link data-user-guide-item="settings" to="/settings" viewTransition>
                <Settings size={18} />
                <SidebarLabel className="truncate">Settings</SidebarLabel>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              data-user-guide-item="global-search"
              aria-keyshortcuts={shortcutToAria(bindings["global-search"])}
              title="Global Search"
              isActive={searchOpen}
              onClick={() => setSearchOpen(true)}
            >
              <Search size={18} />
              <SidebarLabel className="truncate">Global Search</SidebarLabel>
              {!collapsed ? shortcutHint(bindings["global-search"]) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              data-user-guide-item="toggle-theme"
              aria-keyshortcuts={shortcutToAria(bindings["toggle-theme"])}
              title={nextThemeLabel}
              onClick={toggleTheme}
            >
              {nextTheme === "light" ? (
                <Sun size={18} />
              ) : nextTheme === "dark" ? (
                <Moon size={18} />
              ) : (
                <Monitor size={18} />
              )}
              <SidebarLabel className="truncate">{nextThemeLabel}</SidebarLabel>
              {!collapsed ? shortcutHint(bindings["toggle-theme"]) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              data-user-guide-item="toggle-fullscreen"
              aria-keyshortcuts={shortcutToAria(bindings["toggle-fullscreen"])}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              <SidebarLabel className="truncate">
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </SidebarLabel>
              {!collapsed ? shortcutHint(bindings["toggle-fullscreen"]) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              data-user-guide-item="toggle-sidebar"
              aria-keyshortcuts={shortcutToAria(bindings["toggle-sidebar"])}
              title={collapseLabel}
              aria-expanded={!collapsed}
              onClick={toggleSidebar}
            >
              {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
              <SidebarLabel className="truncate">{collapseLabel}</SidebarLabel>
              {!collapsed ? shortcutHint(bindings["toggle-sidebar"]) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
