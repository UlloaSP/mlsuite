import { useState } from "react";
import type { OrganizationMembershipRowDto } from "@/features/workspace/api/workspace.types";
import { AppButton } from "@/shared/ui/AppButton";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
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
    <div className="fixed inset-0 z-(--z-overlay) grid place-items-center bg-overlay p-4">
      <div className="w-full max-w-sm rounded border border-line bg-surface p-5 shadow-hover">
        <h2 className="text-lg font-semibold text-fg">Transfer owner</h2>
        <p className="mt-2 text-sm leading-6 text-fg-secondary">
          The selected member receives full control immediately. You will lose owner-only
          permissions after confirming.
        </p>
        {showLoading ? (
          <>
            <div className="mt-4">
              <AppLoadingState compact label="Loading members..." />
            </div>
            <div className="mt-5 flex justify-end">
              <AppButton type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
                Cancel
              </AppButton>
            </div>
          </>
        ) : (
          <>
            {error ? (
              <p role="alert" className="mt-4 text-sm text-danger-fg">
                {error.message}
              </p>
            ) : null}
            <select
              aria-label="New organization owner"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="mt-4 w-full rounded border border-line bg-surface px-3 py-2 text-sm text-fg"
            >
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName} - {member.email}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <AppButton type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
                Cancel
              </AppButton>
              <AppButton
                type="button"
                disabled={disabled || Boolean(error) || !selected}
                onClick={() => void onConfirm(Number(selected)).catch(() => undefined)}
              >
                Confirm transfer
              </AppButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
