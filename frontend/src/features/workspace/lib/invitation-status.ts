import type { InvitationDto } from "@/shared/api/openapi.gen";

/**
 * A pending or expired invitation is still open: it can be resent or revoked. An accepted,
 * declined or revoked one is closed, and the API refuses both.
 */
export const isOpenInvitation = (invite: Pick<InvitationDto, "status">): boolean =>
  invite.status === "PENDING" || invite.status === "EXPIRED";
