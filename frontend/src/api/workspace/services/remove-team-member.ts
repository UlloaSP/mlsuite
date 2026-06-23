/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";

export const removeTeamMember = (teamId: number, membershipId: number): Promise<void> =>
  appFetch<void>(`/api/teams/${teamId}/members/${membershipId}`, { method: "DELETE" });
