import { useState } from "react";
import { AppCombobox, AppButton, AppSelect } from "../../app/components";
import type { InvitationCandidateDto } from "../invitations/types";
import type { RoleDefinitionDto, TeamDto } from "../types";

const defaultRoleId = (roles: RoleDefinitionDto[]) =>
  roles.find((role) => role.systemKey === "MEMBER")?.id ?? roles[0]?.id ?? null;

export function InviteForm({
  teams,
  candidates,
  onSubmit,
  roleOptions,
}: {
  teams: TeamDto[];
  candidates: InvitationCandidateDto[];
  onSubmit: (payload: {
    email: string;
    roleDefinitionId: number;
    teamId?: number;
  }) => Promise<void>;
  roleOptions: RoleDefinitionDto[];
}) {
  const [candidate, setCandidate] = useState<InvitationCandidateDto | null>(null);
  const [roleDefinitionId, setRoleDefinitionId] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const selectedRoleId = roleDefinitionId ? Number(roleDefinitionId) : defaultRoleId(roleOptions);
  const canSubmit = Boolean(candidate && selectedRoleId);
  const candidateItems = candidates.map((item) => ({
    id: item.id,
    label: item.fullName,
    description: item.email,
    avatarUrl: item.avatarUrl,
  }));
  const submit = () => {
    if (!canSubmit || !selectedRoleId || !candidate) return;
    void onSubmit({
      email: candidate.email,
      roleDefinitionId: selectedRoleId,
      teamId: teamId ? Number(teamId) : undefined,
    }).then(() => {
      setCandidate(null);
      setRoleDefinitionId("");
      setTeamId("");
    });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.4fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)_auto] lg:items-start">
      <AppCombobox
        value={candidate?.id ?? null}
        items={candidateItems}
        placeholder="Search user"
        emptyLabel="No users outside this organization"
        onChange={(item) =>
          setCandidate(candidates.find((candidate) => candidate.id === item?.id) ?? null)
        }
      />
      <AppSelect
        className="rounded-xl shadow-none"
        value={selectedRoleId ? String(selectedRoleId) : ""}
        onChange={(event) => setRoleDefinitionId(event.target.value)}
        disabled={roleOptions.length === 0}
      >
        {roleOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </AppSelect>
      <AppSelect
        className="rounded-xl shadow-none"
        value={teamId}
        onChange={(event) => setTeamId(event.target.value)}
      >
        <option value="">No team</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </AppSelect>
      <AppButton
        type="button"
        className="w-full rounded-xl px-5 lg:w-auto"
        disabled={!canSubmit}
        onClick={submit}
      >
        Send Invite
      </AppButton>
    </div>
  );
}
