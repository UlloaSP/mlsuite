import { useState } from "react";
import { useParams } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppTextArea } from "@/shared/ui/AppTextArea";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import {
  useRemoveTeamMemberMutation,
  useUpdateTeamMemberRoleMutation,
  useUpdateTeamMutation,
} from "@/features/workspace/api/team.mutations";
import { MemberTable } from "@/features/workspace/components/MemberTable";
import {
  useOrganizationTeamMembersQuery,
  useOrganizationTeamQuery,
} from "@/features/workspace/api/workspace.queries";

export function TeamDetailPage() {
  const { organizationId = "", teamId = "" } = useParams();
  const id = Number(teamId);
  const { data: team } = useOrganizationTeamQuery(organizationId, id);
  const { data: members = [] } = useOrganizationTeamMembersQuery(organizationId, id);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const update = useUpdateTeamMutation(organizationId, id);
  const updateMemberRole = useUpdateTeamMemberRoleMutation(organizationId, id);
  const removeMember = useRemoveTeamMemberMutation(organizationId, id);

  async function saveTeam() {
    if (!team) {
      return;
    }
    await update.mutateAsync({
      name: name || team.name,
      description: description || team.description || "",
    });
  }

  if (!team) {
    return null;
  }
  if (!team.permissions.canViewTeam) {
    return <NotFoundError />;
  }

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          eyebrow="Team"
          title={team.name}
          description={team.description || "Manage team profile and member roles."}
          breadcrumbs={[
            { label: "Workspace", to: "/workspace" },
            { label: "Teams", to: `/workspace/organizations/${team.organizationId}/teams` },
            { label: team.name },
          ]}
        />
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.2fr]">
          <div className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-5 shadow-[var(--shadow-card)]">
            <div className="grid gap-3">
              <AppTextField
                value={name || team.name}
                onChange={(event) => setName(event.target.value)}
                disabled={!team.permissions.canEditTeam}
              />
              <AppTextArea
                value={description || team.description || ""}
                onChange={(event) => setDescription(event.target.value)}
                disabled={!team.permissions.canEditTeam}
              />
              <AppButton
                type="button"
                onClick={() => void saveTeam()}
                disabled={!team.permissions.canEditTeam}
              >
                Save Team
              </AppButton>
            </div>
          </div>
          <MemberTable
            rows={members}
            onRoleChange={(membershipId, roleDefinitionId) => {
              updateMemberRole.mutate({ membershipId, roleDefinitionId });
            }}
            onRemove={(membershipId) => {
              removeMember.mutate(membershipId);
            }}
          />
        </div>
      </AppSurface>
    </AppPage>
  );
}
