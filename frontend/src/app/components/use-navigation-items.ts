/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  Blocks,
  BrainCircuit,
  Building2,
  ClipboardList,
  MessageSquareText,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import { useLocation } from "react-router";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { getActiveSchemaPath, getSchemaNavigationChildren } from "./schema-sidebar-navigation";
import { INFRA_CHILDREN, type NavigationItem } from "./sidebar-navigation-support";

/** Main navigation entries the member may open, shared by the sidebar and the bar. */
export function useNavigationItems() {
  const location = useLocation();
  const { data: user } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const permissions = workspace?.permissions;
  const activeSchemaPath = getActiveSchemaPath(location.pathname);
  const currentOrganizationPath = workspace
    ? `/workspace/organizations/${workspace.currentOrganization.id}`
    : undefined;

  const navigation: NavigationItem[] = [
    ...(user?.systemRole === "SUPERADMIN"
      ? [
          {
            to: "/workspace/organizations",
            icon: Building2,
            label: "Organizations",
            activeWhen: (pathname: string) =>
              pathname === "/workspace/organizations" ||
              pathname === "/workspace/organizations/create" ||
              Boolean(
                currentOrganizationPath &&
                pathname.startsWith("/workspace/organizations/") &&
                !pathname.startsWith(currentOrganizationPath),
              ),
          },
        ]
      : []),
    ...(permissions?.canViewModels ? [{ to: "/models", icon: BrainCircuit, label: "Models" }] : []),
    ...(permissions?.canViewModels
      ? [
          {
            to: activeSchemaPath ?? "/schemas",
            icon: ClipboardList,
            label: "Schemas",
            children: getSchemaNavigationChildren(activeSchemaPath),
          },
        ]
      : []),
    ...(permissions?.canViewModels
      ? [{ to: "/inferences", icon: BrainCircuit, label: "Inferences" }]
      : []),
    ...(permissions?.canViewPlugins ? [{ to: "/plugins", icon: Blocks, label: "Plugins" }] : []),
    ...(permissions?.canReview || permissions?.canManageReviews
      ? [{ to: "/review", icon: MessageSquareText, label: "Review" }]
      : []),
    ...(user?.systemRole === "SUPERADMIN"
      ? [
          { to: "/admin/users", icon: ShieldCheck, label: "Users" },
          {
            to: "/admin/infrastructure",
            icon: ServerCog,
            label: "Infra",
            children: INFRA_CHILDREN,
          },
        ]
      : []),
  ];

  const isParentActive = (item: NavigationItem) =>
    item.activeWhen?.(location.pathname) ??
    (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

  return {
    navigation,
    isParentActive,
    currentPath: `${location.pathname}${location.search}`,
    pathname: location.pathname,
  };
}
