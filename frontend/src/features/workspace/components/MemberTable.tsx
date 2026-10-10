import { UserMinus } from "lucide-react";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { MemberRoleSelect } from "./MemberRoleSelect";
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
  organizationId,
  onRoleChange,
  onRemove,
}: {
  rows: MemberTableRow[];
  organizationId: number;
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
              <MemberRoleSelect
                organizationId={organizationId}
                memberId={row.id}
                name={row.fullName}
                role={row.role}
                onChange={(roleId) => onRoleChange(row.id, roleId)}
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
