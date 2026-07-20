/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useWorkspaceContext } from "./use-workspace-context";

export const useCurrentOrganizationId = (): number | undefined =>
  useWorkspaceContext().data?.currentOrganization.id;
