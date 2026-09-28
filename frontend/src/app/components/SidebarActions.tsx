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
import { SidebarGroupLabel } from "./app-sidebar/SidebarGroupLabel";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { SidebarMenuButton } from "./app-sidebar/SidebarMenuButton";
import { useSidebar } from "./app-sidebar/SidebarContext";

export function SidebarActions() {
  const [searchOpen, setSearchOpen] = useAtom(globalSearchOpenAtom);
  const bindings = useAtomValue(shortcutBindingsAtom);
  const { collapsed } = useSidebar();

  return (
    <section className="grid gap-1.5 py-2">
      <SidebarGroupLabel>Tooling</SidebarGroupLabel>
      <div className="grid gap-1">
        <ul className="grid gap-1">
          <UserGuideButton />
          <li className="relative min-w-0">
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
          </li>
        </ul>
      </div>
    </section>
  );
}
