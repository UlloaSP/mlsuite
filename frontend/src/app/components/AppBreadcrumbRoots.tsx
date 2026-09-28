/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo, type ReactNode } from "react";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { BreadcrumbProvider } from "@/shared/ui/breadcrumb/BreadcrumbProvider";
import { OrganizationMenuContent } from "./OrganizationMenuContent";
import { sidebarMenuContent } from "./sidebar-menu-styles";

/**
 * Every page trail starts at who the page belongs to: the current organization
 * (with its switcher), your account, or the platform administration.
 */
export function AppBreadcrumbRoots({ children }: { children: ReactNode }) {
  const { data: context } = useWorkspaceContext();
  const { data: user } = useUser();

  const roots = useMemo(
    () => ({
      organization: context
        ? {
            label: context.currentOrganization.name,
            to: "/workspace",
            menuLabel: "Switch organization",
            menu: (
              <OrganizationMenuContent
                align="start"
                side="bottom"
                context={context}
                className={sidebarMenuContent(true)}
              />
            ),
          }
        : undefined,
      account: { label: user?.fullName ?? "Account", to: "/profile" },
      platform: { label: "Administration", to: "/workspace/organizations" },
    }),
    [context, user?.fullName],
  );

  return <BreadcrumbProvider roots={roots}>{children}</BreadcrumbProvider>;
}
