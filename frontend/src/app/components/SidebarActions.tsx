/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Maximize, Minimize, Moon, PanelRightClose, PanelRightOpen, Sun } from "lucide-react";
import { useAtom } from "jotai";
import { fullscreenAtom, themeWithHtmlAtom } from "../atoms";
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

export function SidebarActions() {
  const [theme, setTheme] = useAtom(themeWithHtmlAtom);
  const [isFullscreen, setIsFullscreen] = useAtom(fullscreenAtom);
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const collapseLabel = collapsed ? "Expand" : "Collapse";

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Actions</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              title={theme === "light" ? "Dark Mode" : "Light Mode"}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
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
