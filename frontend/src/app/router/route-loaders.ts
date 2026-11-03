/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { QueryClient } from "@tanstack/react-query";
import { userQueryOptions } from "@/capabilities/workspace-context/session";
import { workspaceContextQueryOptions } from "@/capabilities/workspace-context/workspace-context";

/**
 * Starts reading what a member's page shows, in the organization the tab works in, while the
 * page's chunk loads. It never fails the navigation: without a session ProtectedRoute sends the
 * visitor to sign in, and a failed read is the page's own to show when it asks for the data.
 */
export const prefetchForMember = async (
  queryClient: QueryClient,
  prefetch: (organizationId: number) => Promise<unknown>,
) => {
  const signedIn = await queryClient.ensureQueryData(userQueryOptions()).then(
    () => true,
    () => false,
  );
  if (!signedIn) return;
  const workspace = await queryClient
    .ensureQueryData(workspaceContextQueryOptions())
    .catch(() => undefined);
  if (workspace) await prefetch(workspace.currentOrganization.id);
};
