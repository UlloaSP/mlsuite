import type { PropsWithChildren } from "react";
import { useParams } from "react-router";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import { EditorAssemblyLoader } from "@/shared/ui/EditorAssemblyLoader";
import type { TeamPermissionsDto } from "@/features/workspace/api/workspace.types";
import { useTeamPermissions } from "@/features/workspace/api/workspace.queries";

export function RequireTeamPermission({
  permission,
  children,
}: PropsWithChildren<{ permission: keyof TeamPermissionsDto }>) {
  const { organizationId = "", teamId = "" } = useParams();
  const query = useTeamPermissions(Number(organizationId), Number(teamId));

  if (!organizationId || !teamId) {
    return <NotFoundError />;
  }
  if (query.isLoading) return <EditorAssemblyLoader />;
  if (query.error) throw query.error;

  return query.data?.permissions[permission] ? <>{children}</> : <NotFoundError status={403} />;
}
