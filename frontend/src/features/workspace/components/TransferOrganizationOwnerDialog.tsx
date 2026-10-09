import { useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { catalogRemoteProps } from "@/shared/ui/catalog/catalogRemoteProps";
import { useOwnerCandidateCatalog } from "@/features/workspace/api/workspace-catalog-queries";
import { useStableLoading } from "@/shared/ui/useStableLoading";

export function TransferOrganizationOwnerDialog({
  disabled,
  error,
  organizationId,
  onCancel,
  onConfirm,
}: {
  disabled: boolean;
  error: Error | null;
  organizationId: number;
  onCancel: () => void;
  onConfirm: (membershipId: number) => Promise<void>;
}) {
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const query = useOwnerCandidateCatalog(organizationId, search);
  const showLoading = useStableLoading(query.isLoading);
  return (
    <AppDialog
      open
      busy={disabled}
      onClose={onCancel}
      title="Transfer owner"
      description="The selected member receives full control immediately. You will lose owner-only permissions after confirming."
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
            Cancel
          </AppButton>
          {showLoading ? null : (
            <AppButton
              type="button"
              disabled={disabled || Boolean(error) || !selected}
              onClick={() => void onConfirm(Number(selected)).catch(() => undefined)}
            >
              Confirm transfer
            </AppButton>
          )}
        </>
      }
    >
      {showLoading ? (
        <AppLoadingState compact label="Loading members…" />
      ) : (
        <>
          {error ? (
            <p role="alert" className="mb-4 text-sm text-danger-fg">
              {error.message}
            </p>
          ) : null}
          <AppCombobox
            {...catalogRemoteProps(query, setSearch)}
            aria-label="New organization owner"
            emptyLabel="No other active members"
            placeholder="Search member"
            value={selected ? Number(selected) : null}
            onChange={(item) => setSelected(item ? String(item.id) : "")}
            items={(query.data?.items ?? []).map((member) => ({
              id: member.id,
              label: member.fullName,
              description: member.email,
            }))}
          />
        </>
      )}
    </AppDialog>
  );
}
