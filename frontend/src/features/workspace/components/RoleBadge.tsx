import { AppBadge } from "@/shared/ui/AppBadge";
import type { InvitationDto, OrganizationMembershipDto } from "@/shared/api/openapi.gen";

/** System keys of the built-in organization roles. */
type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
type RoleValue = OrganizationRole | OrganizationMembershipDto["status"] | InvitationDto["status"];

const tones: Record<RoleValue, "accent" | "danger" | "neutral" | "success" | "warning"> = {
  OWNER: "accent",
  ADMIN: "warning",
  MEMBER: "neutral",
  VIEWER: "neutral",
  ACTIVE: "success",
  PENDING: "warning",
  REMOVED: "danger",
  ACCEPTED: "success",
  EXPIRED: "danger",
  REVOKED: "danger",
};

export function RoleBadge({ value }: { value: RoleValue | string }) {
  return <AppBadge tone={tones[value as RoleValue] ?? "neutral"}>{value}</AppBadge>;
}
