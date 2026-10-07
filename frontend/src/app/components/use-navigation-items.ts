/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useLocation } from "react-router";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import { EXPLORE_NAVIGATION_ITEM } from "./explore-navigation";
import { getActiveSchemaPath, getSchemaNavigationChildren } from "./schema-sidebar-navigation";
import { useSectionMemory } from "./section-memory";
import {
  INFRA_CHILDREN,
  type NavigationGroup,
  type NavigationItem,
} from "./sidebar-navigation-support";

/**
 * Navigation the member may open, shared by the sidebar and the bar: the public
 * feed first, which every member has, then the organization's work and platform
 * administration (for superadmins). Alt+N shortcuts number the entries in that order.
 * An entry for a workspace or administration section the member is not in resumes
 * where they last were in it; Explore always opens the feed.
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

  const canViewModels = Boolean(permissions?.canViewModels);
  const superadmin = user?.systemRole === "SUPERADMIN";
  const entries: Array<NavigationItem & { visible: boolean }> = [
    {
      visible: canViewModels,
      root: "/predict",
      to: "/predict",
      icon: SECTION_ICONS.predict,
      label: "Predict",
    },
    {
      visible: canViewModels,
      root: "/models",
      to: "/models",
      icon: SECTION_ICONS.models,
      label: "Models",
    },
    {
      visible: canViewModels,
      root: "/schemas",
      to: activeSchemaPath ?? "/schemas",
      icon: SECTION_ICONS.schemas,
      label: "Schemas",
      children: getSchemaNavigationChildren(activeSchemaPath),
    },
    {
      visible: canViewModels,
      root: "/inferences",
      to: "/inferences",
      icon: SECTION_ICONS.inferences,
      label: "Inferences",
    },
    {
      visible: Boolean(permissions?.canViewPlugins),
      root: "/plugins",
      to: "/plugins",
      icon: SECTION_ICONS.plugins,
      label: "Plugins",
    },
    {
      visible: Boolean(permissions?.canReview || permissions?.canManageReviews),
      root: "/review",
      to: "/review",
      icon: SECTION_ICONS.reviews,
      label: "Review",
    },
  ];
  const navigation: NavigationItem[] = entries.filter((entry) => entry.visible);

  /** Platform administration, kept apart from the organization's own work. */
  const administration: NavigationItem[] = superadmin
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
          root: "/admin/public-bookmarks",
          to: "/admin/public-bookmarks",
          icon: SECTION_ICONS.moderation,
          label: "Moderation",
        },
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
      : { ...item, to: recall(item.root)?.href ?? item.to };

  const sections = {
    navigation: navigation.map(resume),
    administration: administration.map(resume),
  };
  const groups: NavigationGroup[] = [
    { label: "Public", items: [EXPLORE_NAVIGATION_ITEM] },
    { label: "Workspace", items: sections.navigation },
    { label: "Administration", items: sections.administration },
  ].filter((group) => group.items.length > 0);

  return {
    ...sections,
    /** Every entry shown, grouped as the sidebar labels them; empty groups are left out. */
    groups,
    // Section memory belongs to the organization's sections, so the public feed is not one.
    activeRoot: [...navigation, ...administration].find(isParentActive)?.root,
    isParentActive,
    currentPath: `${location.pathname}${location.search}`,
    pathname: location.pathname,
  };
}
