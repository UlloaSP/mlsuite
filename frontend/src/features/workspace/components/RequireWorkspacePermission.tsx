import type { PropsWithChildren } from "react";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import type { WorkspacePermissionKey } from "@/capabilities/workspace-context/workspace-context.types";
import { useCan } from "@/capabilities/workspace-context/workspace-context";

export function RequireWorkspacePermission({
  permission,
  children,
}: PropsWithChildren<{ permission: WorkspacePermissionKey }>) {
  const canAccess = useCan(permission);
  return canAccess ? <>{children}</> : <NotFoundError />;
}
