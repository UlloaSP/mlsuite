import type { PropsWithChildren } from "react";
import { NotFoundError } from "../../app/pages/error-page";
import type { WorkspacePermissionKey } from "../types";
import { useCan, useCurrentUserIsSuperadmin } from "../permissions/useWorkspacePermissions";

export function RequireWorkspacePermission({
	permission,
	children,
}: PropsWithChildren<{ permission: WorkspacePermissionKey }>) {
	return useCan(permission) ? <>{children}</> : <NotFoundError />;
}

export function RequireSuperadmin({ children }: PropsWithChildren) {
	return useCurrentUserIsSuperadmin() ? <>{children}</> : <NotFoundError />;
}
