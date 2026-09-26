import { ArrowRight, Blocks, Settings } from "lucide-react";
import { Link } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { useOrganizationAdminDashboardQuery } from "@/features/workspace/api/workspace.queries";
import { RoleBadge } from "@/features/workspace/components/RoleBadge";
import { LifecycleStageCard } from "@/features/workspace/components/overview/LifecycleStageCard";
import { OverviewInvitationsPanel } from "@/features/workspace/components/overview/OverviewInvitationsPanel";
import { OverviewMembersPanel } from "@/features/workspace/components/overview/OverviewMembersPanel";
import { lifecycleStages } from "@/features/workspace/lib/workspace-overview";

export function WorkspaceHomePage() {
  const { data: context } = useWorkspaceContext();
  const dashboard = useOrganizationAdminDashboardQuery(context?.currentOrganization.id ?? 0);

  if (!context) {
    return null;
  }

  const { currentOrganization: organization, permissions } = context;
  const basePath = `/workspace/organizations/${organization.id}`;
  const data = dashboard.data;
  const stages = lifecycleStages(permissions, data?.stats);
  const showPeople = permissions.canViewMembers || permissions.canViewInvitations;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-8 overflow-auto">
        <AppPageHeader
          eyebrow="Workspace overview"
          title={organization.name}
          description={
            organization.description ||
            `Everything ${organization.slug} runs, from uploaded models to reviewed predictions.`
          }
          actions={
            <div className="flex items-center gap-2">
              <RoleBadge value={context.currentMembership.role} />
              {permissions.canViewOrganization ? (
                <Link
                  to={`${basePath}/settings`}
                  viewTransition
                  className={cx(
                    "inline-flex items-center gap-2 rounded border border-line bg-surface px-3 py-2 text-sm font-medium text-fg hover:border-line-strong hover:bg-surface-hover",
                    FOCUS_RING,
                  )}
                >
                  <Settings size={15} />
                  Settings
                </Link>
              ) : null}
            </div>
          }
        />

        {dashboard.isError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger-border bg-danger-subtle px-5 py-4 text-sm text-danger-fg"
          >
            The overview could not be loaded. Counts and recent activity are unavailable.
            <AppButton
              variant="secondary"
              className="px-3 py-2"
              onClick={() => void dashboard.refetch()}
            >
              Try again
            </AppButton>
          </div>
        ) : null}

        {stages.length > 0 ? (
          <section aria-labelledby="lifecycle-heading">
            <h2 id="lifecycle-heading" className="text-sm font-semibold text-fg">
              Model lifecycle
            </h2>
            <p className="mt-1 text-sm text-fg-secondary">
              Upload models, describe them with schemas, run predictions, and review the results.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stages.map((stage, index) => (
                <LifecycleStageCard key={stage.key} stage={stage} step={index + 1} />
              ))}
            </div>
          </section>
        ) : null}

        {showPeople ? (
          <div className="grid gap-4 lg:grid-cols-2">
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

        {permissions.canViewPlugins ? (
          <Link
            to="/plugins"
            viewTransition
            className={cx(
              "group flex items-center gap-4 rounded-xl border border-line bg-surface px-5 py-4 transition hover:border-line-strong hover:bg-surface-hover",
              FOCUS_RING,
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-secondary">
              <Blocks size={17} />
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
