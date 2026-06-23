/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { LucideIcon } from "lucide-react";

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
