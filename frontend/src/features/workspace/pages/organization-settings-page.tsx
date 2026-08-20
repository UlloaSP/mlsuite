import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { useState } from "react";
import { useParams } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppTextArea } from "@/shared/ui/AppTextArea";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import {
  useTransferOrganizationOwnershipMutation,
  useUpdateOrganizationMutation,
} from "@/features/workspace/api/workspace.mutations";
import {
  useOrganizationDetailsQuery,
  useOrganizationMembersQuery,
} from "@/features/workspace/api/workspace.queries";

export function OrganizationSettingsPage() {
  const { organizationId = "" } = useParams();
  const id = Number(organizationId);
  const { data: workspace } = useWorkspaceContext();
  const { data: organization } = useOrganizationDetailsQuery(id);
  const { data: members = [] } = useOrganizationMembersQuery(
    id,
    Boolean(workspace?.permissions.canTransferOwnership),
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nextOwnerMembershipId, setNextOwnerMembershipId] = useState("");
  const updateMutation = useUpdateOrganizationMutation(id);
  const transferMutation = useTransferOrganizationOwnershipMutation();

  const effectiveName = name || organization?.name || "";
  const effectiveDescription = description || organization?.description || "";

  async function submit() {
    await updateMutation.mutateAsync({
      name: effectiveName,
      description: effectiveDescription,
    });
  }

  async function transferOwnership() {
    const membershipId = Number(nextOwnerMembershipId);
    if (!membershipId) {
      return;
    }
    await transferMutation.mutateAsync({ organizationId: id, nextOwnerMembershipId: membershipId });
    setNextOwnerMembershipId("");
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
          breadcrumbs={[{ label: "Workspace", to: "/workspace" }, { label: "Settings" }]}
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
                  onValueChange={setNextOwnerMembershipId}
                  className="min-w-[260px]"
                  options={[
                    { value: "", label: "Select member" },
                    ...ownerCandidates.map((member) => ({
                      value: String(member.id),
                      label: `${member.fullName} - ${member.email}`,
                    })),
                  ]}
                />
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
