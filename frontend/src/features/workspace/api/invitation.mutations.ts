import { mutationOptions, useMutation } from "@tanstack/react-query";
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

/** `includeCandidates`: whether the change alters who can still be invited. */
const invitationMutation = <TData, TVariables>(
  organizationId: number,
  mutationFn: (variables: TVariables) => Promise<TData>,
  includeCandidates = false,
) =>
  mutationOptions({
    mutationFn,
    onSuccess: (_data, _variables, _result, { client }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: organizationInvitationsQueryKey(organizationId) }),
        ...(includeCandidates
          ? [
              client.invalidateQueries({
                queryKey: organizationInvitationCandidatesQueryKey(organizationId),
              }),
            ]
          : []),
      ]),
  });

export const useCreateInvitationMutation = (organizationId: number) =>
  useMutation(
    invitationMutation(
      organizationId,
      (payload: Parameters<typeof createInvitation>[1]) =>
        createInvitation(organizationId, payload),
      true,
    ),
  );

export const useBulkRevokeInvitationsMutation = (organizationId: number) =>
  useMutation(
    invitationMutation(organizationId, (ids: number[]) =>
      bulkRevokeInvitations(organizationId, ids),
    ),
  );

export const useResendInvitationMutation = (organizationId: number) =>
  useMutation(
    invitationMutation(organizationId, (invitationId: number) =>
      resendInvitation(organizationId, invitationId),
    ),
  );

export const useRevokeInvitationMutation = (organizationId: number) =>
  useMutation(
    invitationMutation(organizationId, (invitationId: number) =>
      revokeInvitation(organizationId, invitationId),
    ),
  );
