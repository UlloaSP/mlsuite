/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Bell, Settings, User2 } from "lucide-react";

export const ACCOUNT_LINKS = [
  { to: "/profile", icon: User2, label: "Profile" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

export const isAccountLinkActive = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`);

export const isAccountPath = (pathname: string) =>
  ACCOUNT_LINKS.some(({ to }) => isAccountLinkActive(pathname, to));

export const countLabel = (count: number) => (count > 9 ? "9+" : String(count));
