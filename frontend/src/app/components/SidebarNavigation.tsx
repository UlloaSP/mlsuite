/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { cx } from "@/shared/ui/cx";
import { AppKbd } from "@/shared/ui/AppKbd";
import { isChildActive } from "./sidebar-navigation-support";
import { useNavigationItems } from "./use-navigation-items";
import { useNavigationShortcuts } from "./use-navigation-shortcuts";
import { SidebarGroup } from "./app-sidebar/SidebarGroup";
import { SidebarGroupContent } from "./app-sidebar/SidebarGroupContent";
import { SidebarGroupLabel } from "./app-sidebar/SidebarGroupLabel";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { SidebarMenu } from "./app-sidebar/SidebarMenu";
import { SidebarMenuButton } from "./app-sidebar/SidebarMenuButton";
import { SidebarMenuItem } from "./app-sidebar/SidebarMenuItem";
import { SidebarMenuSub } from "./app-sidebar/SidebarMenuSub";
import { SidebarMenuSubButton } from "./app-sidebar/SidebarMenuSubButton";
import { SidebarMenuSubItem } from "./app-sidebar/SidebarMenuSubItem";
import { useSidebar } from "./app-sidebar/SidebarContext";

export function SidebarNavigation() {
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState<string | null | undefined>(undefined);
  const { state } = useSidebar();
  const { navigation, isParentActive, currentPath, pathname } = useNavigationItems();
  const showShortcutHints = useNavigationShortcuts({
    navigation,
    showHints: state !== "collapsed",
    shortcutChildren: () => {
      const parent =
        openItem === undefined
          ? navigation.find((item) => item.children?.length && isParentActive(item))
          : navigation.find((item) => item.to === openItem && item.children?.length);
      return parent?.children ?? [];
    },
  });

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu aria-label="Main navigation">
          {navigation.map((item, index) => {
            const active = isParentActive(item);
            const hasChildren = Boolean(item.children?.length);
            const open = openItem === undefined ? active : openItem === item.to;
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.to}>
                {hasChildren ? (
                  <SidebarMenuButton
                    data-user-guide-item={`nav:${item.label}`}
                    aria-expanded={open}
                    aria-keyshortcuts={`Alt+${String(index + 1)}`}
                    isActive={active}
                    onClick={() => {
                      if (state === "collapsed") {
                        void navigate(item.children?.[0]?.to ?? item.to, { viewTransition: true });
                        return;
                      }
                      setOpenItem((current) => (current === item.to ? null : item.to));
                    }}
                    title={item.label}
                    type="button"
                  >
                    <Icon size={18} className="shrink-0" />
                    <SidebarLabel className="truncate">{item.label}</SidebarLabel>
                    {state !== "collapsed" ? (
                      <AppKbd
                        aria-hidden={!showShortcutHints}
                        className={cx("ml-auto shrink-0", !showShortcutHints && "invisible")}
                      >
                        {String(index + 1)}
                      </AppKbd>
                    ) : null}
                    {state !== "collapsed" ? (
                      <ChevronRight
                        size={15}
                        className={cx(
                          "shrink-0 transition-transform duration-200",
                          !showShortcutHints && "ml-auto",
                          open && "rotate-90",
                        )}
                      />
                    ) : null}
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton asChild isActive={active} title={item.label}>
                    <Link
                      data-user-guide-item={`nav:${item.label}`}
                      aria-keyshortcuts={`Alt+${String(index + 1)}`}
                      to={item.to}
                      viewTransition
                    >
                      <Icon size={18} className="shrink-0" />
                      <SidebarLabel className="truncate">{item.label}</SidebarLabel>
                      {state !== "collapsed" ? (
                        <AppKbd
                          aria-hidden={!showShortcutHints}
                          className={cx("ml-auto shrink-0", !showShortcutHints && "invisible")}
                        >
                          {String(index + 1)}
                        </AppKbd>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                )}
                {item.children && state !== "collapsed" ? (
                  <div
                    aria-hidden={!open}
                    inert={!open}
                    className={cx(
                      "grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <SidebarMenuSub>
                        {item.children.map((child, childIndex) => {
                          const childActive = isChildActive(child, currentPath, pathname);
                          const ChildIcon = child.icon;
                          const childShortcut = String(childIndex + 1);

                          return (
                            <SidebarMenuSubItem key={child.to}>
                              <SidebarMenuSubButton asChild isActive={childActive}>
                                <Link
                                  data-user-guide-item={`subnav:${child.label}`}
                                  aria-keyshortcuts={`Alt+Shift+${childShortcut}`}
                                  to={child.to}
                                  viewTransition
                                >
                                  <ChildIcon size={14} className="shrink-0" />
                                  <span className="truncate">{child.label}</span>
                                  <AppKbd
                                    aria-hidden={!showShortcutHints}
                                    className={cx(
                                      "ml-auto h-4 min-w-4 shrink-0 text-3xs",
                                      !showShortcutHints && "invisible",
                                    )}
                                  >
                                    {childShortcut}
                                  </AppKbd>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </div>
                  </div>
                ) : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
