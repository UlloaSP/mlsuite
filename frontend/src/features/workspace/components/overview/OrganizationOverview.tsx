/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowRight, Settings } from "lucide-react";
import { Link } from "react-router";
import { RoleBadge } from "@/features/workspace/components/RoleBadge";
import { lifecycleStages } from "@/features/workspace/lib/workspace-overview";
import type { AppBreadcrumbItem } from "@/shared/ui/AppBreadcrumbs";
import { AppButton } from "@/shared/ui/AppButton";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { appButtonClass } from "@/shared/ui/button-styles";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import { LifecycleStageCard } from "./LifecycleStageCard";
import { OverviewInvitationsPanel } from "./OverviewInvitationsPanel";
import { OverviewMembersPanel } from "./OverviewMembersPanel";
import type {
  OrganizationAdminDashboardDto,
  OrganizationDto,
  WorkspacePermissionsDto,
} from "@/shared/api/openapi.gen";

// Columns follow the number of visible stages, so no row ends in empty cells.
const STAGE_COLUMNS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "md:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
};

/**
 * The organization dashboard, for the active organization (/workspace) or any
 * organization a superadmin opens. Stage links point at the active
 * organization's pages, so they are only offered when isCurrent.
 */
export function OrganizationOverview({
  breadcrumbs,
  dashboard,
  isCurrent,
  organization,
  permissions,
  role,
}: {
  breadcrumbs?: AppBreadcrumbItem[];
  dashboard: {
    data?: OrganizationAdminDashboardDto;
    isError: boolean;
    refetch: () => unknown;
  };
  isCurrent: boolean;
  organization: OrganizationDto;
  permissions: WorkspacePermissionsDto;
  role?: string;
}) {
  const basePath = `/workspace/organizations/${organization.id}`;
  const data = dashboard.data;
  const stages = lifecycleStages(permissions, data?.stats, { linked: isCurrent });
  const showPeople = permissions.canViewMembers || permissions.canViewInvitations;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          breadcrumbs={breadcrumbs}
          title={organization.name}
          description={
            organization.description ||
            `Everything ${organization.slug} runs, from uploaded models to reviewed predictions.`
          }
          actions={
            <>
              {permissions.canViewOrganization ? (
                <Link
                  to={`${basePath}/settings`}
                  viewTransition
                  className={appButtonClass({ variant: "secondary" })}
                >
                  <Settings size={15} />
                  Settings
                </Link>
              ) : null}
              {role ? <RoleBadge value={role} /> : null}
            </>
          }
        />

        {dashboard.isError ? (
          <AppInlineAlert className="flex flex-wrap items-center justify-between gap-3">
            The overview could not be loaded. Counts and recent activity are unavailable.
            <AppButton variant="secondary" size="sm" onClick={() => void dashboard.refetch()}>
              Try again
            </AppButton>
          </AppInlineAlert>
        ) : null}

        {stages.length > 0 ? (
          <section aria-labelledby="lifecycle-heading">
            <h2 id="lifecycle-heading" className="text-sm font-semibold text-fg">
              Model lifecycle
            </h2>
            <p className="mt-1 text-sm text-fg-secondary">
              Upload models, describe them with schemas, run predictions, and review the results.
            </p>
            <div className={cx("mt-4 grid gap-3", STAGE_COLUMNS[stages.length])}>
              {stages.map((stage, index) => (
                <LifecycleStageCard key={stage.key} stage={stage} step={index + 1} />
              ))}
            </div>
          </section>
        ) : null}

        {showPeople ? (
          <div
            className={cx(
              "grid gap-4",
              permissions.canViewMembers && permissions.canViewInvitations && "lg:grid-cols-2",
            )}
          >
            {permissions.canViewMembers ? (
              <OverviewMembersPanel
                members={data?.recentMembers ?? []}
                total={data?.stats.totalMembers}
                to={`${basePath}/members`}
              />
            ) : null}
            {permissions.canViewInvitations ? (
              <OverviewInvitationsPanel
                invitations={data?.recentInvitations ?? []}
                pending={data?.stats.pendingInvitations}
                to={`${basePath}/invitations`}
              />
            ) : null}
          </div>
        ) : null}

        {/* Plugins live under the active organization, so only its overview links there. */}
        {permissions.canViewPlugins && isCurrent ? (
          <Link
            to="/plugins"
            viewTransition
            className={cx(
              "group flex items-center gap-4 rounded-card border border-line bg-surface px-5 py-4 transition hover:border-line-strong hover:bg-surface-hover",
              FOCUS_RING,
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-secondary">
              <SECTION_ICONS.plugins size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-fg">Plugins</span>
              <span className="block text-xs text-fg-secondary">
                {data === undefined
                  ? "Extensions for forms and reports."
                  : `${data.stats.totalPlugins} in this organization, extending forms and reports.`}
              </span>
            </span>
            <ArrowRight
              size={15}
              className="text-fg-muted transition group-hover:translate-x-0.5 group-hover:text-fg"
            />
          </Link>
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
