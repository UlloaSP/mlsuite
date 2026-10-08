/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { SidebarNavigationGroup } from "./SidebarNavigationGroup";
import { useNavigationItems } from "./use-navigation-items";
import { useNavigationShortcuts } from "./use-navigation-shortcuts";
import { useSidebar } from "./app-sidebar/SidebarContext";

/** One labelled group per kind of navigation the member has, numbered through in order. */
export function SidebarNavigation() {
  const [openItem, setOpenItem] = useState<string | null | undefined>(undefined);
  const { collapsed } = useSidebar();
  const { groups, isParentActive, currentPath, pathname } = useNavigationItems();
  const allItems = groups.flatMap((group) => group.items);
  const showShortcutHints = useNavigationShortcuts({
    navigation: allItems,
    showHints: !collapsed,
    shortcutChildren: () => {
      const parent =
        openItem === undefined
          ? allItems.find((item) => item.children?.length && isParentActive(item))
          : allItems.find((item) => item.root === openItem && item.children?.length);
      return parent?.children ?? [];
    },
  });
  const shared = {
    currentPath,
    isParentActive,
    openItem,
    pathname,
    setOpenItem,
    showShortcutHints,
  };

  return groups.map((group) => (
    <SidebarNavigationGroup
      {...shared}
      key={group.label}
      firstIndex={allItems.indexOf(group.items[0])}
      items={group.items}
      label={group.label}
    />
  ));
}
