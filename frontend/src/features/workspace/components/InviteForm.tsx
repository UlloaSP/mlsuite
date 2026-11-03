import { useState } from "react";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { catalogRemoteProps } from "@/shared/ui/catalog/catalogRemoteProps";
import {
  useInvitationCandidateCatalog,
  useRoleCatalog,
} from "@/features/workspace/api/workspace-catalog-queries";
import type { InvitationCandidateDto, RoleDefinitionDto } from "@/shared/api/openapi.gen";

export function InviteForm({
  organizationId,
  onSubmit,
}: {
  organizationId: number;
  onSubmit: (payload: { email: string; roleDefinitionId: number }) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const candidateQuery = useInvitationCandidateCatalog(organizationId, search);
  const roleQuery = useRoleCatalog(organizationId, roleSearch, true, "invitable");
  const candidates = candidateQuery.data?.items ?? [];
  const roleOptions = roleQuery.data?.items ?? [];
  // The starting role is Member, or the first invitable role when there is none. It comes from the
  // unfiltered list, which the role field's own query shares until someone searches roles.
  const unfilteredRoles = useRoleCatalog(organizationId, "", true, "invitable").data?.items ?? [];
  const defaultRole =
    unfilteredRoles.find((role) => role.systemKey === "MEMBER") ?? unfilteredRoles[0] ?? null;
  const [candidate, setCandidate] = useState<InvitationCandidateDto | null>(null);
  // The role picked in the field: undefined until someone picks (the default applies), null if cleared.
  const [pickedRole, setPickedRole] = useState<RoleDefinitionDto | null | undefined>(undefined);
  const selectedRole = pickedRole === undefined ? defaultRole : pickedRole;
  const noRoles =
    roleSearch === "" && !roleQuery.isPlaceholderData && roleQuery.data?.totalItems === 0;
  const selectedRoleId = selectedRole?.id ?? null;
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
      setSearch("");
      setRoleSearch("");
      setPickedRole(undefined);
    });
  };

  if (noRoles) return <AppCopy>No assignable roles available.</AppCopy>;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.4fr)_minmax(180px,0.7fr)_auto] lg:items-start">
      <AppCombobox
        {...catalogRemoteProps(candidateQuery, setSearch)}
        selectedItem={
          candidate
            ? { id: candidate.id, label: candidate.fullName, description: candidate.email }
            : undefined
        }
        value={candidate?.id ?? null}
        items={candidateItems}
        placeholder="Search user"
        emptyLabel="No users outside this organization"
        onChange={(item) =>
          setCandidate(candidates.find((candidate) => candidate.id === item?.id) ?? null)
        }
      />
      <AppCombobox
        {...catalogRemoteProps(roleQuery, setRoleSearch)}
        selectedItem={selectedRole ? { id: selectedRole.id, label: selectedRole.name } : undefined}
        value={selectedRoleId}
        items={roleOptions.map((role) => ({ id: role.id, label: role.name }))}
        placeholder="Search role"
        onChange={(role) =>
          setPickedRole(roleOptions.find((option) => option.id === role?.id) ?? null)
        }
      />
      <AppButton type="button" className="w-full lg:w-auto" disabled={!canSubmit} onClick={submit}>
        Send invite
      </AppButton>
    </div>
  );
}
