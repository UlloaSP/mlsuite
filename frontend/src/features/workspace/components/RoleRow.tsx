import { Lock } from "lucide-react";
import { AppBadge } from "@/shared/ui/AppBadge";
import type { RoleDefinitionDto } from "@/features/workspace/api/workspace.types";

export function RoleRow({ role, onOpen }: { role: RoleDefinitionDto; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[16px] border border-[var(--border-soft)] p-4 text-left hover:bg-[var(--surface-tertiary)]"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-[12px] bg-[var(--surface-tertiary)] p-3">
          <Lock size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {role.name} {role.locked ? <AppBadge>Locked</AppBadge> : null}{" "}
            <AppBadge>{role.userCount} users</AppBadge>
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{role.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {role.permissions.slice(0, 5).map((permission) => (
              <AppBadge key={permission.key}>{permission.label}</AppBadge>
            ))}
            {role.permissions.length > 5 ? (
              <AppBadge>+{role.permissions.length - 5} more</AppBadge>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}
