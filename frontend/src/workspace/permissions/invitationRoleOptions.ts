import type { OrganizationRole } from "../types";

export function invitationRoleOptions(canTransferOwnership: boolean): OrganizationRole[] {
	return canTransferOwnership
		? ["OWNER", "ADMIN", "MEMBER", "VIEWER"]
		: ["ADMIN", "MEMBER", "VIEWER"];
}
