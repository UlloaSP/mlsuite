import { AppButton, AppCopy, AppPanel, AppSelect } from "../../app/components";
import { RoleBadge } from "./RoleBadge";
import type {
  MembershipRowActionsDto,
  MembershipStatus,
  RoleSummaryDto,
} from "../../api/workspace/dtos";

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
        <AppPanel key={row.id}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-base font-semibold text-[var(--text-primary)]">{row.fullName}</p>
              <p className="text-sm text-[var(--text-secondary)]">{row.email}</p>
              <div className="flex flex-wrap gap-2">
                <RoleBadge value={row.role.name} />
                {row.role.systemKey ? <RoleBadge value={row.role.systemKey} /> : null}
                <RoleBadge value={row.status} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {row.actions.canChangeRole && row.role.id ? (
                <AppSelect
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
