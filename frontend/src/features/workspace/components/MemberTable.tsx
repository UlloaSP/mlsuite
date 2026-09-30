import { UserMinus } from "lucide-react";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { AppSelect } from "@/shared/ui/AppSelect";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { RoleBadge } from "./RoleBadge";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import type {
  MembershipActionsDto,
  OrganizationMembershipRowDto,
  RoleSummaryDto,
} from "@/shared/api/openapi.gen";

type MemberTableRow = {
  id: number;
  fullName: string;
  email: string;
  status: OrganizationMembershipRowDto["status"];
  role: RoleSummaryDto;
  actions: MembershipActionsDto;
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
    return <AppEmptyState compact title="No members yet" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <CatalogEntry
          key={row.id}
          title={row.fullName}
          titleAccessory={
            <>
              <RoleBadge value={row.role.name} />
              <RoleBadge value={row.status} />
            </>
          }
          description={row.email}
          details={
            row.actions.canChangeRole && row.role.id ? (
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
              <span>Read only</span>
            )
          }
          actions={
            row.actions.canRemove ? (
              <AppActionsMenu
                label={`Open actions for ${row.fullName}`}
                actions={[
                  {
                    key: "remove",
                    label: "Remove",
                    icon: UserMinus,
                    tone: "danger",
                    onSelect: () => onRemove(row.id),
                  },
                ]}
              />
            ) : null
          }
        />
      ))}
    </div>
  );
}
