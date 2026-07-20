import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router";
import {
  AppButton,
  AppTextArea,
  AppTextField,
  AppPage,
  AppPageHeader,
  AppSurface,
} from "@/app/components";
import { NotFoundError } from "@/app/pages/error-page";
import {
  getTeam,
  getTeamMembers,
  removeTeamMember,
  updateTeam,
  updateTeamMemberRole,
} from "@/api/workspace/services";
import { MemberTable } from "@/workspace/components/MemberTable";
import {
  organizationResourceQueryKey,
  organizationTeamQueryKey,
} from "@/api/workspace/hooks/query-keys";

export function TeamDetailPage() {
  const { organizationId = "", teamId = "" } = useParams();
  const qc = useQueryClient();
  const id = Number(teamId);
  const { data: team } = useQuery({
    queryKey: organizationTeamQueryKey(organizationId, id),
    queryFn: () => getTeam(id),
    enabled: Boolean(id),
  });
  const { data: members = [] } = useQuery({
    queryKey: organizationResourceQueryKey(organizationId, "team-members", id),
    queryFn: () => getTeamMembers(id),
    enabled: Boolean(id),
  });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function saveTeam() {
    if (!team) {
      return;
    }
    await updateTeam(id, {
      name: name || team.name,
      description: description || team.description || "",
    });
    await qc.invalidateQueries({ queryKey: organizationTeamQueryKey(organizationId, id) });
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
              void updateTeamMemberRole(id, membershipId, roleDefinitionId).then(() =>
                qc.invalidateQueries({
                  queryKey: organizationResourceQueryKey(organizationId, "team-members", id),
                }),
              );
            }}
            onRemove={(membershipId) => {
              void removeTeamMember(id, membershipId).then(() =>
                qc.invalidateQueries({
                  queryKey: organizationResourceQueryKey(organizationId, "team-members", id),
                }),
              );
            }}
          />
        </div>
      </AppSurface>
    </AppPage>
  );
}
