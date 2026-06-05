import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router";
import { AppButton, AppTextArea, AppTextField } from "../../app/components/ui-controls";
import { AppPage, AppPageHeader, AppSurface } from "../../app/components/ui";
import { NotFoundError } from "../../app/pages/error-page";
import {
  getTeam,
  getTeamMembers,
  removeTeamMember,
  updateTeam,
  updateTeamMemberRole,
} from "../api/workspaceService";
import { MemberTable } from "../components/MemberTable";

export function TeamDetailPage() {
  const { teamId = "" } = useParams();
  const qc = useQueryClient();
  const id = Number(teamId);
  const { data: team } = useQuery({
    queryKey: ["team", id],
    queryFn: () => getTeam(id),
    enabled: Boolean(id),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["teamMembers", id],
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
    await qc.invalidateQueries({ queryKey: ["team", id] });
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
          backHref={`/workspace/organizations/${team.organizationId}/teams`}
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
                qc.invalidateQueries({ queryKey: ["teamMembers", id] }),
              );
            }}
            onRemove={(membershipId) => {
              void removeTeamMember(id, membershipId).then(() =>
                qc.invalidateQueries({ queryKey: ["teamMembers", id] }),
              );
            }}
          />
        </div>
      </AppSurface>
    </AppPage>
  );
}
