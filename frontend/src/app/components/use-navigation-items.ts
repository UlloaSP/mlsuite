/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useLocation } from "react-router";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import { getActiveSchemaPath, getSchemaNavigationChildren } from "./schema-sidebar-navigation";
import { useSectionMemory } from "./section-memory";
import { INFRA_CHILDREN, type NavigationItem } from "./sidebar-navigation-support";

/**
 * Navigation the member may open, shared by the sidebar and the bar: the
 * organization's work, and (for superadmins) platform administration.
 * Alt+N shortcuts number both in order, workspace first. An entry for a section
 * the member is not in resumes where they last were in it.
 */
export function useNavigationItems() {
  const location = useLocation();
  const { data: user } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const { recall } = useSectionMemory();
  const permissions = workspace?.permissions;
  const activeSchemaPath = getActiveSchemaPath(location.pathname);
  const currentOrganizationPath = workspace
    ? `/workspace/organizations/${workspace.currentOrganization.id}`
    : undefined;

  const navigation: NavigationItem[] = [
    ...(permissions?.canViewModels
      ? [{ root: "/predict", to: "/predict", icon: SECTION_ICONS.predict, label: "Predict" }]
      : []),
    ...(permissions?.canViewModels
      ? [{ root: "/models", to: "/models", icon: SECTION_ICONS.models, label: "Models" }]
      : []),
    ...(permissions?.canViewModels
      ? [
          {
            root: "/schemas",
            to: activeSchemaPath ?? "/schemas",
            icon: SECTION_ICONS.schemas,
            label: "Schemas",
            children: getSchemaNavigationChildren(activeSchemaPath),
          },
        ]
      : []),
    ...(permissions?.canViewModels
      ? [
          {
            root: "/inferences",
            to: "/inferences",
            icon: SECTION_ICONS.inferences,
            label: "Inferences",
          },
        ]
      : []),
    ...(permissions?.canViewPlugins
      ? [{ root: "/plugins", to: "/plugins", icon: SECTION_ICONS.plugins, label: "Plugins" }]
      : []),
    ...(permissions?.canReview || permissions?.canManageReviews
      ? [{ root: "/review", to: "/review", icon: SECTION_ICONS.reviews, label: "Review" }]
      : []),
  ];

  /** Platform administration, kept apart from the organization's own work. */
  const administration: NavigationItem[] =
    user?.systemRole === "SUPERADMIN"
      ? [
          {
            root: "/workspace/organizations",
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
          { root: "/admin/users", to: "/admin/users", icon: SECTION_ICONS.users, label: "Users" },
          {
            root: "/admin/infrastructure",
            to: "/admin/infrastructure",
            icon: SECTION_ICONS.infrastructure,
            label: "Infra",
            children: INFRA_CHILDREN,
          },
        ]
      : [];

  const isParentActive = (item: NavigationItem) =>
    item.activeWhen?.(location.pathname) ??
    (location.pathname === item.root || location.pathname.startsWith(`${item.root}/`));
  // Inside a section its entry leads to the section's start; elsewhere it resumes.
  const resume = (item: NavigationItem): NavigationItem =>
    isParentActive(item) || item.children?.length
      ? item
      : { ...item, to: recall(item.root) ?? item.to };

  return {
    navigation: navigation.map(resume),
    administration: administration.map(resume),
    activeRoot: [...navigation, ...administration].find(isParentActive)?.root,
    isParentActive,
    currentPath: `${location.pathname}${location.search}`,
    pathname: location.pathname,
  };
}
