import { useMutation, useQueryClient } from "@tanstack/react-query";
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

const useInboxMutation = <TVariables>(mutationFn: (variables: TVariables) => Promise<void>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
};

export const useMarkNotificationRead = () => useInboxMutation(markNotificationRead);
export const useMarkAllNotificationsRead = () =>
  useInboxMutation<void>(() => markAllNotificationsRead());
export const useDeleteNotification = () => useInboxMutation(deleteNotification);
export const useDeleteReadNotifications = () =>
  useInboxMutation<void>(() => deleteReadNotifications());

const useInvalidateAnswered = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
  };
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();
  const invalidateAnswered = useInvalidateAnswered();
  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      invalidateAnswered();
      void queryClient.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY });
    },
  });
};

export const useDeclineInvitation = () => {
  const invalidateAnswered = useInvalidateAnswered();
  return useMutation({ mutationFn: declineInvitation, onSuccess: invalidateAnswered });
};
