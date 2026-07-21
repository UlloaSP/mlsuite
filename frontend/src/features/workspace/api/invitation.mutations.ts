import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bulkRevokeInvitations,
  createInvitation,
  resendInvitation,
  revokeInvitation,
} from "./invitations.api";
import {
  organizationInvitationCandidatesQueryKey,
  organizationInvitationsQueryKey,
} from "./workspace.keys";

const useInvitationInvalidation = (organizationId: number) => {
  const queryClient = useQueryClient();
  return (includeCandidates = false) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: organizationInvitationsQueryKey(organizationId) }),
      ...(includeCandidates
        ? [
            queryClient.invalidateQueries({
              queryKey: organizationInvitationCandidatesQueryKey(organizationId),
            }),
          ]
        : []),
    ]);
};

export const useCreateInvitationMutation = (organizationId: number) => {
  const invalidate = useInvitationInvalidation(organizationId);
  return useMutation({
    mutationFn: (payload: Parameters<typeof createInvitation>[1]) =>
      createInvitation(organizationId, payload),
    onSuccess: () => invalidate(true),
  });
};

export const useBulkRevokeInvitationsMutation = (organizationId: number) => {
  const invalidate = useInvitationInvalidation(organizationId);
  return useMutation({
    mutationFn: (ids: number[]) => bulkRevokeInvitations(organizationId, ids),
    onSuccess: () => invalidate(),
  });
};

export const useResendInvitationMutation = (organizationId: number) => {
  const invalidate = useInvitationInvalidation(organizationId);
  return useMutation({
    mutationFn: (invitationId: number) => resendInvitation(organizationId, invitationId),
    onSuccess: () => invalidate(),
  });
};

export const useRevokeInvitationMutation = (organizationId: number) => {
  const invalidate = useInvitationInvalidation(organizationId);
  return useMutation({
    mutationFn: (invitationId: number) => revokeInvitation(organizationId, invitationId),
    onSuccess: () => invalidate(),
  });
};
