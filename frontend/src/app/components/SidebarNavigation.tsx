/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { SidebarNavigationGroup } from "./SidebarNavigationGroup";
import { useNavigationItems } from "./use-navigation-items";
import { useNavigationShortcuts } from "./use-navigation-shortcuts";
import { useSidebar } from "./app-sidebar/SidebarContext";

/** The organization's work, then platform administration for superadmins. */
export function SidebarNavigation() {
  const [openItem, setOpenItem] = useState<string | null | undefined>(undefined);
  const { collapsed } = useSidebar();
  const { navigation, administration, isParentActive, currentPath, pathname } =
    useNavigationItems();
  const allItems = [...navigation, ...administration];
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

  return (
    <>
      <SidebarNavigationGroup {...shared} firstIndex={0} items={navigation} label="Workspace" />
      {administration.length > 0 ? (
        <SidebarNavigationGroup
          {...shared}
          firstIndex={navigation.length}
          items={administration}
          label="Administration"
        />
      ) : null}
    </>
  );
}
