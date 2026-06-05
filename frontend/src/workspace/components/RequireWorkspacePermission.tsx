import type { PropsWithChildren } from "react";
import { NotFoundError } from "../../app/pages/error-page";
import type { WorkspacePermissionKey } from "../types";
import { useCan, useCurrentUserIsSuperadmin } from "../permissions/useWorkspacePermissions";

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
