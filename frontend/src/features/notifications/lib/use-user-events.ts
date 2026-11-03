/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { buildWebSocketUrl } from "@/shared/api/websocket-url";
import {
  NOTIFICATIONS_QUERY_KEY,
  PENDING_INVITATIONS_QUERY_KEY,
} from "@/features/notifications/api/notification.queries";

/** How long a lost connection waits before the next attempt: doubling from 1 s up to 30 s. */
const FIRST_RETRY_MS = 1_000;
const LAST_RETRY_MS = 30_000;

type UserEvent = { type: "notifications.changed" };

/**
 * The signed-in member's event socket (/api/me/events), open while the app shell is. The API says
 * when their notifications changed, and the inbox, the badge and the pending invitations are read
 * again; every (re)connection reads them once, for what was missed while it was down.
 */
export function useUserEvents(signedIn: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!signedIn) return;
    let socket: WebSocket | undefined;
    let retry: number | undefined;
    let delay = FIRST_RETRY_MS;
    let stopped = false;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
    };
    const connect = () => {
      socket = new WebSocket(buildWebSocketUrl("/api/me/events"));
      socket.addEventListener("open", () => {
        delay = FIRST_RETRY_MS;
        refresh();
      });
      socket.addEventListener("message", (event: MessageEvent<string>) => {
        const message = JSON.parse(event.data) as UserEvent;
        if (message.type === "notifications.changed") refresh();
      });
      socket.addEventListener("close", () => {
        if (stopped) return;
        retry = window.setTimeout(connect, delay);
        delay = Math.min(delay * 2, LAST_RETRY_MS);
      });
    };
    connect();
    return () => {
      stopped = true;
      window.clearTimeout(retry);
      socket?.close();
    };
  }, [queryClient, signedIn]);
}
