/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import type { InvitationDto } from "@/capabilities/workspace-context/workspace-context.types";
import type { CreateInvitationRequest, InvitationCandidateDto } from "./workspace.types";

export const acceptInvitation = (token: string): Promise<InvitationDto> =>
  appFetch<InvitationDto>(`/api/invitations/${encodeURIComponent(token)}/accept`, {
    method: "POST",
  });

export const bulkRevokeInvitations = (
  organizationId: number,
  invitationIds: number[],
): Promise<void> =>
  appFetch<void>(
    `/api/organizations/${organizationId}/invitations/bulk-revoke`,
    json("POST", { invitationIds }),
  );

export const createInvitation = (
  organizationId: number,
  payload: CreateInvitationRequest,
): Promise<InvitationDto> =>
  appFetch<InvitationDto>(
    `/api/organizations/${organizationId}/invitations`,
    json("POST", payload),
  );

export const declineInvitation = (token: string): Promise<void> =>
  appFetch<void>(`/api/invitations/${encodeURIComponent(token)}/decline`, { method: "POST" });

export const getInvitationCandidates = (
  organizationId: number,
  signal?: AbortSignal,
): Promise<InvitationCandidateDto[]> =>
  appFetch<InvitationCandidateDto[]>(`/api/organizations/${organizationId}/invitation-candidates`, {
    signal,
  });

export const getInvitations = (
  organizationId: number,
  signal?: AbortSignal,
): Promise<InvitationDto[]> =>
  appFetch<InvitationDto[]>(`/api/organizations/${organizationId}/invitations`, { signal });

export const getPendingInvitations = (signal?: AbortSignal): Promise<InvitationDto[]> =>
  appFetch<InvitationDto[]>("/api/invitations/pending", { signal });

export const resendInvitation = (
  organizationId: number,
  invitationId: number,
): Promise<InvitationDto> =>
  appFetch<InvitationDto>(
    `/api/organizations/${organizationId}/invitations/${invitationId}/resend`,
    { method: "POST" },
  );

export const revokeInvitation = (organizationId: number, invitationId: number): Promise<void> =>
  appFetch<void>(`/api/organizations/${organizationId}/invitations/${invitationId}`, {
    method: "DELETE",
  });
