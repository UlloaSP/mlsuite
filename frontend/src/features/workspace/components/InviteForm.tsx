import { useState } from "react";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import type {
  InvitationCandidateDto,
  RoleDefinitionDto,
} from "@/features/workspace/api/workspace.types";

const defaultRoleId = (roles: RoleDefinitionDto[]) =>
  roles.find((role) => role.systemKey === "MEMBER")?.id ?? roles[0]?.id ?? null;

export function InviteForm({
  candidates,
  onSubmit,
  roleOptions,
}: {
  candidates: InvitationCandidateDto[];
  onSubmit: (payload: { email: string; roleDefinitionId: number }) => Promise<void>;
  roleOptions: RoleDefinitionDto[];
}) {
  const [candidate, setCandidate] = useState<InvitationCandidateDto | null>(null);
  const [roleDefinitionId, setRoleDefinitionId] = useState<string>("");
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
    }).then(() => {
      setCandidate(null);
      setRoleDefinitionId("");
    });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.4fr)_minmax(180px,0.7fr)_auto] lg:items-start">
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
        className="rounded shadow-none"
        value={selectedRoleId ? String(selectedRoleId) : ""}
        onValueChange={setRoleDefinitionId}
        disabled={roleOptions.length === 0}
        options={roleOptions.map((option) => ({
          value: String(option.id),
          label: option.name,
        }))}
      />
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
