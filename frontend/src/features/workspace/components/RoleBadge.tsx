import { AppBadge } from "@/shared/ui/AppBadge";
import type {
  InvitationStatus,
  MembershipStatus,
  OrganizationRole,
} from "@/capabilities/workspace-context/workspace-context.types";

type RoleValue = OrganizationRole | MembershipStatus | InvitationStatus;

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
  return (
    <AppBadge tone={tones[value as RoleValue] ?? "neutral"}>{value.replaceAll("_", " ")}</AppBadge>
  );
}
