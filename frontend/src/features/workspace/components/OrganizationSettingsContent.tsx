import { useState } from "react";
import { useNavigate } from "react-router";
import type {
  OrganizationDto,
  WorkspacePermissionsDto,
} from "@/capabilities/workspace-context/workspace-context.types";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppTextArea } from "@/shared/ui/AppTextArea";
import { AppTextField } from "@/shared/ui/AppTextField";
import {
  useDeleteOrganizationMutation,
  useTransferOrganizationOwnershipMutation,
  useUpdateOrganizationMutation,
} from "@/features/workspace/api/workspace.mutations";
import { useOrganizationMembersQuery } from "@/features/workspace/api/workspace.queries";
import { DeleteOrganizationDialog } from "./DeleteOrganizationDialog";
import { TransferOrganizationOwnerDialog } from "./TransferOrganizationOwnerDialog";

type OrganizationDraft = { description?: string; name?: string; slug?: string };

type OrganizationSettingsContentProps = {
  organization: OrganizationDto;
  permissions: WorkspacePermissionsDto;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "The request could not be completed.";

export function OrganizationSettingsContent({
  organization,
  permissions,
}: OrganizationSettingsContentProps) {
  const navigate = useNavigate();
  const id = organization.id;
  const members = useOrganizationMembersQuery(id, permissions.canTransferOwnership);
  const update = useUpdateOrganizationMutation(id);
  const transfer = useTransferOrganizationOwnershipMutation();
  const remove = useDeleteOrganizationMutation();
  const [draft, setDraft] = useState<OrganizationDraft>({});
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const name = draft.name ?? organization.name;
  const slug = draft.slug ?? organization.slug;
  const description = draft.description ?? organization.description ?? "";
  const ownerCandidates = (members.data ?? []).filter(
    (member) => member.status === "ACTIVE" && member.role.systemKey !== "OWNER",
  );

  return (
    <>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {permissions.canEditOrganization ? (
          <form
            className="grid max-w-3xl gap-5 border-t border-[var(--border-soft)] pt-6"
            onSubmit={(event) => {
              event.preventDefault();
              update.mutate(
                { name: name.trim(), slug: slug.trim(), description },
                { onSuccess: () => setDraft({}) },
              );
            }}
          >
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Identity</h2>
              <AppCopy className="mt-1">Shown across this organization's workspace.</AppCopy>
            </div>
            <div className="grid gap-2">
              <label htmlFor="organization-name" className="text-sm font-semibold">
                Name
              </label>
              <AppTextField
                id="organization-name"
                aria-label="Organization name"
                className="w-full"
                value={name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="organization-slug" className="text-sm font-semibold">
                Slug
              </label>
              <AppTextField
                id="organization-slug"
                aria-label="Organization slug"
                className="w-full"
                value={slug}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, slug: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="organization-description" className="text-sm font-semibold">
                Description
              </label>
              <AppTextArea
                id="organization-description"
                aria-label="Organization description"
                className="w-full"
                value={description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            {update.isError ? (
              <p role="alert" className="text-sm text-[var(--danger-text)]">
                {errorMessage(update.error)}
              </p>
            ) : null}
            {update.isSuccess ? (
              <p role="status" className="text-sm text-[var(--success-text)]">
                Organization saved.
              </p>
            ) : null}
            <AppButton
              type="submit"
              className="w-fit"
              disabled={update.isPending || !name.trim() || !slug.trim()}
            >
              {update.isPending ? "Saving..." : "Save changes"}
            </AppButton>
          </form>
        ) : null}

        {permissions.canTransferOwnership ? (
          <section className="max-w-3xl border-t border-[var(--border-soft)] py-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Ownership</h2>
            <AppCopy className="mt-1 max-w-2xl">
              Transfer full control to another active member. Your account will lose owner-only
              permissions as soon as the transfer completes.
            </AppCopy>
            {transfer.isError || members.isError ? (
              <p role="alert" className="mt-3 text-sm text-[var(--danger-text)]">
                {errorMessage(transfer.error ?? members.error)}
              </p>
            ) : null}
            {transfer.isSuccess ? (
              <p role="status" className="mt-3 text-sm text-[var(--success-text)]">
                Ownership transferred.
              </p>
            ) : null}
            <AppButton
              type="button"
              variant="secondary"
              className="mt-4"
              disabled={members.isLoading || members.isError || ownerCandidates.length === 0}
              onClick={() => setTransferOpen(true)}
            >
              Transfer ownership
            </AppButton>
          </section>
        ) : null}

        {permissions.canDeleteOrganization ? (
          <section className="max-w-3xl border-t border-[var(--border-soft)] py-6">
            <h2 className="text-xl font-semibold text-[var(--danger-text)]">Danger zone</h2>
            <AppCopy className="mt-1 max-w-2xl">
              Delete this organization permanently. The API refuses deletion while organization
              resources still exist.
            </AppCopy>
            {remove.isError ? (
              <p role="alert" className="mt-3 text-sm text-[var(--danger-text)]">
                {errorMessage(remove.error)}
              </p>
            ) : null}
            <AppButton
              type="button"
              variant="danger"
              className="mt-4"
              disabled={remove.isPending}
              onClick={() => setDeleteOpen(true)}
            >
              Delete organization
            </AppButton>
          </section>
        ) : null}
      </div>

      {transferOpen ? (
        <TransferOrganizationOwnerDialog
          disabled={transfer.isPending}
          error={transfer.error ?? members.error}
          loading={members.isLoading}
          members={ownerCandidates}
          onCancel={() => setTransferOpen(false)}
          onConfirm={async (membershipId) => {
            await transfer.mutateAsync({ organizationId: id, nextOwnerMembershipId: membershipId });
            setTransferOpen(false);
          }}
        />
      ) : null}
      {deleteOpen ? (
        <DeleteOrganizationDialog
          disabled={remove.isPending}
          error={remove.error}
          name={organization.name}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={async () => {
            await remove.mutateAsync(id);
            void navigate("/workspace");
          }}
        />
      ) : null}
    </>
  );
}
