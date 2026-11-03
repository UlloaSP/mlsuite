import { mutationOptions, useMutation, type QueryClient } from "@tanstack/react-query";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "@/capabilities/workspace-context/workspace-context";
import { NOTIFICATIONS_QUERY_KEY, PENDING_INVITATIONS_QUERY_KEY } from "./notification.queries";
import {
  acceptInvitation,
  declineInvitation,
  deleteNotification,
  deleteReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications.api";

const inboxMutation = <TVariables>(mutationFn: (variables: TVariables) => Promise<void>) =>
  mutationOptions({
    mutationFn,
    onSuccess: (_data, _variables, _result, { client }) =>
      client.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });

const markRead = inboxMutation(markNotificationRead);
const markAllRead = inboxMutation<void>(() => markAllNotificationsRead());
const deleteOne = inboxMutation(deleteNotification);
const deleteRead = inboxMutation<void>(() => deleteReadNotifications());

export const useMarkNotificationRead = () => useMutation(markRead);
export const useMarkAllNotificationsRead = () => useMutation(markAllRead);
export const useDeleteNotification = () => useMutation(deleteOne);
export const useDeleteReadNotifications = () => useMutation(deleteRead);

const invalidateAnswered = (client: QueryClient) => {
  void client.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
  void client.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
};

const acceptInvitationMutation = mutationOptions({
  mutationFn: acceptInvitation,
  onSuccess: (_data, _invitationId, _result, { client }) => {
    invalidateAnswered(client);
    void client.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY });
  },
});

const declineInvitationMutation = mutationOptions({
  mutationFn: declineInvitation,
  onSuccess: (_data, _invitationId, _result, { client }) => invalidateAnswered(client),
});

export const useAcceptInvitation = () => useMutation(acceptInvitationMutation);

export const useDeclineInvitation = () => useMutation(declineInvitationMutation);
