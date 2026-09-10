import { useState } from "react";
import type { OrganizationMembershipRowDto } from "@/features/workspace/api/workspace.types";
import { AppButton } from "@/shared/ui/AppButton";

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
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
      <div className="w-full max-w-sm rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-hover)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Transfer owner</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          The selected member receives full control immediately. You will lose owner-only
          permissions after confirming.
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading members...</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 text-sm text-[var(--danger-text)]">
            {error.message}
          </p>
        ) : null}
        <select
          aria-label="New organization owner"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="mt-4 w-full rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
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
            disabled={disabled || loading || Boolean(error) || !selected}
            onClick={() => void onConfirm(Number(selected)).catch(() => undefined)}
          >
            Confirm transfer
          </AppButton>
        </div>
      </div>
    </div>
  );
}
