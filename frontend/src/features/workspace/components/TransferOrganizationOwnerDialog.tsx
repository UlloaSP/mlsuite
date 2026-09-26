import { useState } from "react";
import type { OrganizationMembershipRowDto } from "@/features/workspace/api/workspace.types";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppSelect } from "@/shared/ui/AppSelect";
import { useStableLoading } from "@/shared/ui/useStableLoading";

export function TransferOrganizationOwnerDialog({
  disabled,
  error,
  loading,
  members,
  onCancel,
  onConfirm,
}: {
  disabled: boolean;
  error: Error | null;
  loading: boolean;
  members: OrganizationMembershipRowDto[];
  onCancel: () => void;
  onConfirm: (membershipId: number) => Promise<void>;
}) {
  const [selected, setSelected] = useState("");
  const showLoading = useStableLoading(loading);
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
          <AppSelect
            aria-label="New organization owner"
            placeholder="Select member"
            value={selected}
            onValueChange={setSelected}
            className="w-full"
            options={members.map((member) => ({
              value: String(member.id),
              label: `${member.fullName} - ${member.email}`,
            }))}
          />
        </>
      )}
    </AppDialog>
  );
}
