import type { PropsWithChildren } from "react";
import { useParams } from "react-router";
import { NotFoundError } from "../../app/pages/error-page";
import type { TeamPermissionsDto } from "../types";
import { useTeamPermissions } from "../permissions/useWorkspacePermissions";

export function RequireTeamPermission({
  permission,
  children,
}: PropsWithChildren<{ permission: keyof TeamPermissionsDto }>) {
  const { teamId = "" } = useParams();
  const permissions = useTeamPermissions(Number(teamId));

  if (!permissions) {
    return null;
  }

  return permissions[permission] ? <>{children}</> : <NotFoundError />;
}
