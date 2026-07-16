/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  ClipboardList,
  GitCommitHorizontal,
  GitCompareArrows,
  LayoutGrid,
  Tags,
} from "lucide-react";
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
    { to: `${activeSchemaPath}/changes`, icon: GitCompareArrows, label: "Changes" },
    { to: `${activeSchemaPath}/bookmarks`, icon: Tags, label: "Bookmarks" },
    { to: `${activeSchemaPath}/snapshots`, icon: GitCommitHorizontal, label: "Snapshots" },
    { to: "/schemas", icon: ClipboardList, label: "All schemas", exact: true },
  ];
}
