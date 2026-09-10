import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSelect } from "@/shared/ui/AppSelect";
import { RoleBadge } from "./RoleBadge";
import type {
  MembershipStatus,
  RoleSummaryDto,
} from "@/capabilities/workspace-context/workspace-context.types";
import type { MembershipRowActionsDto } from "@/features/workspace/api/workspace.types";

type MemberTableRow = {
  id: number;
  fullName: string;
  email: string;
  status: MembershipStatus;
  role: RoleSummaryDto;
  actions: MembershipRowActionsDto;
};

export function MemberTable({
  rows,
  onRoleChange,
  onRemove,
}: {
  rows: MemberTableRow[];
  onRoleChange: (membershipId: number, roleDefinitionId: number) => void;
  onRemove: (membershipId: number) => void;
}) {
  if (rows.length === 0) {
    return (
      <AppPanel className="border-dashed">
        <AppCopy>No members yet.</AppCopy>
      </AppPanel>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <AppPanel key={row.id} variant="catalog">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 space-y-2 break-words">
              <p className="text-base font-semibold text-[var(--text-primary)]">{row.fullName}</p>
              <p className="text-sm text-[var(--text-secondary)]">{row.email}</p>
              <div className="flex flex-wrap gap-2">
                <RoleBadge value={row.role.name} />
                <RoleBadge value={row.status} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {row.actions.canChangeRole && row.role.id ? (
                <AppSelect
                  aria-label={`Role for ${row.fullName}`}
                  value={String(row.role.id)}
                  onValueChange={(roleId) => onRoleChange(row.id, Number(roleId))}
                  className="min-w-40"
                  options={row.actions.assignableRoles.map((role) => ({
                    value: String(role.id ?? ""),
                    label: role.name,
                  }))}
                />
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">Read only</p>
              )}
              {row.actions.canRemove ? (
                <AppButton type="button" variant="danger" onClick={() => onRemove(row.id)}>
                  Remove
                </AppButton>
              ) : null}
            </div>
          </div>
        </AppPanel>
      ))}
    </div>
  );
}
