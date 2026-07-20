import type { PropsWithChildren } from "react";
import { NotFoundError } from "@/app/pages/error-page";
import type { WorkspacePermissionKey } from "@/capabilities/workspace-context/workspace-context.types";
import { useCan } from "@/capabilities/workspace-context/workspace-context";
import { useCurrentUserIsSuperadmin } from "@/features/user/api/user-session";

export function RequireWorkspacePermission({
  permission,
  children,
}: PropsWithChildren<{ permission: WorkspacePermissionKey }>) {
  const canAccess = useCan(permission);
  return canAccess ? <>{children}</> : <NotFoundError />;
}

export function RequireSuperadmin({ children }: PropsWithChildren) {
  const canAccess = useCurrentUserIsSuperadmin();
  return canAccess ? <>{children}</> : <NotFoundError />;
}
