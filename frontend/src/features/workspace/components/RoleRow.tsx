import { Lock } from "lucide-react";
import { AppBadge } from "@/shared/ui/AppBadge";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import type { RoleDefinitionDto } from "@/features/workspace/api/workspace.types";

export function RoleRow({ role, onOpen }: { role: RoleDefinitionDto; onOpen: () => void }) {
  return (
    <CatalogEntry
      title={role.name}
      titleAccessory={role.locked ? <AppBadge>Locked</AppBadge> : null}
      icon={
        <span className="grid size-10 place-items-center rounded-control border border-line text-fg-secondary">
          <Lock size={18} />
        </span>
      }
      description={role.description}
      metadata={
        role.permissions.length > 0 ? (
          <>
            {role.permissions.slice(0, 5).map((permission) => (
              <AppBadge key={permission.key}>{permission.label}</AppBadge>
            ))}
            {role.permissions.length > 5 ? (
              <AppBadge>+{role.permissions.length - 5} more</AppBadge>
            ) : null}
          </>
        ) : null
      }
      details={<AppBadge>{role.userCount} users</AppBadge>}
      onOpen={onOpen}
    />
  );
}
