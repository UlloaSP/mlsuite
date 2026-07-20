/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";

export const declineInvitation = (token: string): Promise<void> =>
  appFetch<void>(`/api/invitations/${encodeURIComponent(token)}/decline`, { method: "POST" });
