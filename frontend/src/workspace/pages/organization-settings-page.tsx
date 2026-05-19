import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router";
import {
  AppButton,
  AppPage,
  AppPageHeader,
  AppPanel,
  AppSelect,
  AppSurface,
  AppTextArea,
  AppTextField,
} from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import {
  getOrganization,
  getOrganizationMembers,
  transferOrganizationOwnership,
  updateOrganization,
} from "../api/workspaceService";
import { useWorkspaceContext } from "../hooks";

export function OrganizationSettingsPage() {
  const { organizationId = "" } = useParams();
  const qc = useQueryClient();
  const id = Number(organizationId);
  const { data: workspace } = useWorkspaceContext();
  const { data: organization } = useQuery({
    queryKey: ["organization", id],
    queryFn: () => getOrganization(id),
    enabled: Boolean(id),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["organizationMembers", id],
    queryFn: () => getOrganizationMembers(id),
    enabled: Boolean(id) && Boolean(workspace?.permissions.canTransferOwnership),
  });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nextOwnerMembershipId, setNextOwnerMembershipId] = useState("");

  const effectiveName = name || organization?.name || "";
  const effectiveDescription = description || organization?.description || "";

  async function submit() {
    await updateOrganization(id, {
      name: effectiveName,
      description: effectiveDescription,
    });
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["organization", id] }),
      qc.invalidateQueries({ queryKey: ["organizations"] }),
      qc.invalidateQueries({ queryKey: ["workspaceContext"] }),
    ]);
  }

  async function transferOwnership() {
    const membershipId = Number(nextOwnerMembershipId);
    if (!membershipId) {
      return;
    }
    await transferOrganizationOwnership(id, membershipId);
    setNextOwnerMembershipId("");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["workspaceContext"] }),
      qc.invalidateQueries({ queryKey: ["organizationMembers", id] }),
      qc.invalidateQueries({ queryKey: ["organization", id] }),
    ]);
  }

  if (!organization) {
    return null;
  }
  if (workspace && !workspace.permissions.canViewOrganization) {
    return <NotFoundError />;
  }
  const ownerCandidates = members.filter(
    (member) => member.status === "ACTIVE" && member.role.systemKey !== "OWNER",
  );

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          eyebrow="Workspace Settings"
          title={organization.name}
          description="Edit the identity of this organization. Ownership and member operations live in adjacent workspace views."
          backHref="/workspace/organizations"
        />
        <div className="max-w-3xl rounded-[32px] border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-6 shadow-[var(--shadow-card)]">
          <div className="grid gap-4">
            <AppTextField
              value={effectiveName}
              onChange={(event) => setName(event.target.value)}
              disabled={!workspace?.permissions.canEditOrganization}
            />
            <AppTextArea
              value={effectiveDescription}
              onChange={(event) => setDescription(event.target.value)}
              disabled={!workspace?.permissions.canEditOrganization}
            />
            <AppButton
              type="button"
              onClick={() => void submit()}
              disabled={!workspace?.permissions.canEditOrganization}
            >
              Save Workspace
            </AppButton>
          </div>
        </div>
        {workspace?.permissions.canTransferOwnership ? (
          <AppPanel className="max-w-3xl">
            <div className="grid gap-4">
              <div>
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  Transfer ownership
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  Move OWNER to another active organization member.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <AppSelect
                  value={nextOwnerMembershipId}
                  onChange={(event) => setNextOwnerMembershipId(event.target.value)}
                  className="min-w-[260px]"
                >
                  <option value="">Select member</option>
                  {ownerCandidates.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName} - {member.email}
                    </option>
                  ))}
                </AppSelect>
                <AppButton
                  type="button"
                  variant="secondary"
                  onClick={() => void transferOwnership()}
                  disabled={!nextOwnerMembershipId}
                >
                  Transfer
                </AppButton>
              </div>
            </div>
          </AppPanel>
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
