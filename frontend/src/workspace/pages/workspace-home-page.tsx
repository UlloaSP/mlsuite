import { Building2, FolderKanban, Puzzle, Users } from "lucide-react";
import { Link } from "react-router";
import { AppBadge } from "../../app/components/ui-controls";
import { AppCopy, AppPage, AppPageHeader, AppPanel, AppSectionTitle, AppSurface } from "../../app/components/ui";
import { useGetModels } from "../../models/hooks";
import { useWorkspaceContext } from "../hooks";

export function WorkspaceHomePage() {
  const { data: context } = useWorkspaceContext();
  const { data: models = [] } = useGetModels();

  if (!context) {
    return null;
  }

  const basePath = `/workspace/organizations/${context.currentOrganization.id}`;
  const cards = [
    ...(context.permissions.canViewTeams ? [{ title: "Teams", icon: Users, href: "teams" }] : []),
    ...(context.permissions.canViewMembers
      ? [{ title: "Members", icon: Building2, href: "members" }]
      : []),
    ...(context.permissions.canViewInvitations
      ? [{ title: "Invitations", icon: FolderKanban, href: "invitations" }]
      : []),
    ...(context.permissions.canViewPlugins
      ? [{ title: "Plugins", icon: Puzzle, href: "/plugins" }]
      : []),
  ] as const;
  const stats = [
    { label: "Members", value: context.memberships.length },
    { label: "Teams", value: context.teams.length },
    { label: "Models", value: models.length },
    { label: "Invites", value: context.invitations.length },
  ];

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          eyebrow="Workspace"
          title={context.currentOrganization.name}
          description="Organization command deck for teams, permissions, plugins, and model operations."
          aside={<AppBadge tone="accent">{context.currentMembership.role}</AppBadge>}
        />
        <section className="grid gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <AppPanel key={stat.label}>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                {stat.label}
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                {stat.value}
              </p>
            </AppPanel>
          ))}
        </section>
        <section className="grid gap-4 xl:grid-cols-4">
          {cards.map((card) => {
            const href = card.href.startsWith("/") ? card.href : `${basePath}/${card.href}`;
            return (
              <Link key={card.title} to={href} className="block">
                <AppPanel className="h-full transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]">
                  <card.icon size={18} className="text-[var(--accent-primary-strong)]" />
                  <AppSectionTitle className="mt-4">{card.title}</AppSectionTitle>
                  <AppCopy className="mt-2">
                    {card.title === "Plugins"
                      ? "See org-scoped runtime extensions."
                      : `Manage ${card.title.toLowerCase()} in ${context.currentOrganization.slug}.`}
                  </AppCopy>
                </AppPanel>
              </Link>
            );
          })}
        </section>
      </AppSurface>
    </AppPage>
  );
}
