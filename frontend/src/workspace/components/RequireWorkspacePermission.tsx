import type { PropsWithChildren } from "react";
import { NotFoundError } from "../../app/pages/error-page";
import type { WorkspacePermissionKey } from "../../api/workspace/dtos";
import { useCan, useCurrentUserIsSuperadmin } from "../../api/workspace/hooks";

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
