/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  AlertTriangle,
  LayoutGrid,
  List,
  Server,
  SquareTerminal,
  type LucideIcon,
} from "lucide-react";

export type NavigationChild = {
  to: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
};

export type NavigationItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  activeWhen?: (pathname: string) => boolean;
  children?: NavigationChild[];
};

export const INFRA_CHILDREN: NavigationChild[] = [
  { to: "/admin/infrastructure", icon: LayoutGrid, label: "Overview", exact: true },
  { to: "/admin/infrastructure?tab=services", icon: Server, label: "Services" },
  { to: "/admin/infrastructure?tab=logs", icon: List, label: "Logs" },
  { to: "/admin/infrastructure?tab=terminal", icon: SquareTerminal, label: "Terminal" },
  { to: "/admin/infrastructure?tab=alerts", icon: AlertTriangle, label: "Alerts" },
];

function splitHref(to: string) {
  const [pathname, search = ""] = to.split("?");
  return { pathname, search: search ? `?${search}` : "" };
}

export function isChildActive(child: NavigationChild, currentPath: string, pathname: string) {
  const childHref = splitHref(child.to);
  const childPath = `${childHref.pathname}${childHref.search}`;

  if (child.exact || childHref.search) {
    return currentPath === childPath;
  }

  return pathname === childHref.pathname || pathname.startsWith(`${childHref.pathname}/`);
}
