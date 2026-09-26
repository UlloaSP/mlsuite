/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useLocation } from "react-router";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
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
            icon: SECTION_ICONS.organizations,
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
    ...(permissions?.canViewModels
      ? [{ to: "/models", icon: SECTION_ICONS.models, label: "Models" }]
      : []),
    ...(permissions?.canViewModels
      ? [
          {
            to: activeSchemaPath ?? "/schemas",
            icon: SECTION_ICONS.schemas,
            label: "Schemas",
            children: getSchemaNavigationChildren(activeSchemaPath),
          },
        ]
      : []),
    ...(permissions?.canViewModels
      ? [{ to: "/inferences", icon: SECTION_ICONS.inferences, label: "Inferences" }]
      : []),
    ...(permissions?.canViewPlugins
      ? [{ to: "/plugins", icon: SECTION_ICONS.plugins, label: "Plugins" }]
      : []),
    ...(permissions?.canReview || permissions?.canManageReviews
      ? [{ to: "/review", icon: SECTION_ICONS.reviews, label: "Review" }]
      : []),
    ...(user?.systemRole === "SUPERADMIN"
      ? [
          { to: "/admin/users", icon: SECTION_ICONS.users, label: "Users" },
          {
            to: "/admin/infrastructure",
            icon: SECTION_ICONS.infrastructure,
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
