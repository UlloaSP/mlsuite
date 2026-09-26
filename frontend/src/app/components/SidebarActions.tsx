/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import { globalSearchOpenAtom } from "@/shared/ui/ui-state";
import { AppShortcut } from "@/shared/ui/AppShortcut";
import { shortcutBindingsAtom, shortcutToAria } from "@/shared/ui/shortcut-state";
import { UserGuideButton } from "./UserGuideButton";
import { SidebarGroup } from "./app-sidebar/SidebarGroup";
import { SidebarGroupContent } from "./app-sidebar/SidebarGroupContent";
import { SidebarGroupLabel } from "./app-sidebar/SidebarGroupLabel";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { SidebarMenu } from "./app-sidebar/SidebarMenu";
import { SidebarMenuButton } from "./app-sidebar/SidebarMenuButton";
import { SidebarMenuItem } from "./app-sidebar/SidebarMenuItem";
import { useSidebar } from "./app-sidebar/SidebarContext";

export function SidebarActions() {
  const [searchOpen, setSearchOpen] = useAtom(globalSearchOpenAtom);
  const bindings = useAtomValue(shortcutBindingsAtom);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Tooling</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <UserGuideButton />
          <SidebarMenuItem>
            <SidebarMenuButton
              data-user-guide-item="global-search"
              aria-keyshortcuts={shortcutToAria(bindings["global-search"])}
              title="Global search"
              isActive={searchOpen}
              onClick={() => setSearchOpen(true)}
            >
              <Search size={18} />
              <SidebarLabel className="truncate">Global search</SidebarLabel>
              {!collapsed ? (
                <AppShortcut binding={bindings["global-search"]} className="ml-auto" />
              ) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
