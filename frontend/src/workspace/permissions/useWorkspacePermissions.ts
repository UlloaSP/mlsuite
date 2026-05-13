import { useQuery } from "@tanstack/react-query";
import { getTeam } from "../api/workspaceService";
import { useWorkspaceContext } from "../hooks";
import { useUser } from "../../user/hooks";
import type { TeamPermissionsDto, WorkspacePermissionKey } from "../types";

function useWorkspacePermissions() {
	return useWorkspaceContext().data?.permissions ?? null;
}

export function useCan(permission: WorkspacePermissionKey) {
	const permissions = useWorkspacePermissions();
	return Boolean(permissions?.[permission]);
}

export function useCurrentUserIsSuperadmin() {
	return useUser().data?.systemRole === "SUPERADMIN";
}

export function useTeamPermissions(teamId: number): TeamPermissionsDto | null {
	return useQuery({
		queryKey: ["team", teamId],
		queryFn: () => getTeam(teamId),
		enabled: Boolean(teamId),
	}).data?.permissions ?? null;
}
