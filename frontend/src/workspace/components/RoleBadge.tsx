import { AppBadge } from "../../app/components";
import type { InvitationStatus, MembershipStatus, OrganizationRole, TeamRole } from "../types";

type RoleValue = OrganizationRole | TeamRole | MembershipStatus | InvitationStatus;

const tones: Record<RoleValue, "accent" | "danger" | "neutral" | "success" | "warning"> = {
	OWNER: "accent",
	ADMIN: "warning",
	MEMBER: "neutral",
	VIEWER: "neutral",
	TEAM_ADMIN: "warning",
	TEAM_MEMBER: "neutral",
	TEAM_VIEWER: "neutral",
	ACTIVE: "success",
	PENDING: "warning",
	REMOVED: "danger",
	ACCEPTED: "success",
	EXPIRED: "danger",
	REVOKED: "danger",
};

export function RoleBadge({ value }: { value: RoleValue }) {
	return <AppBadge tone={tones[value]}>{value.replaceAll("_", " ")}</AppBadge>;
}
