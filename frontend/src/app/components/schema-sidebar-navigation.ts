/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { LayoutGrid } from "lucide-react";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import type { NavigationItem } from "./sidebar-navigation-support";

export function getActiveSchemaPath(pathname: string) {
  const match = /^\/schemas\/([^/]+)/.exec(pathname);
  if (!match || match[1] === "create") return undefined;
  return `/schemas/${match[1]}`;
}

export function getSchemaNavigationChildren(activeSchemaPath?: string): NavigationItem["children"] {
  if (!activeSchemaPath) return undefined;
  return [
    { to: activeSchemaPath, icon: LayoutGrid, label: "Overview", exact: true },
    { to: `${activeSchemaPath}/changes`, icon: SECTION_ICONS.changes, label: "Changes" },
    { to: `${activeSchemaPath}/bookmarks`, icon: SECTION_ICONS.bookmarks, label: "Bookmarks" },
    { to: `${activeSchemaPath}/snapshots`, icon: SECTION_ICONS.snapshots, label: "Snapshots" },
    { to: "/schemas", icon: SECTION_ICONS.schemas, label: "All schemas", exact: true },
  ];
}
