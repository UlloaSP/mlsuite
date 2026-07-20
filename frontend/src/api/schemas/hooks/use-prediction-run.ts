/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQuery } from "@tanstack/react-query";
import { predictionRunQueryOptions } from "@/api/schemas/schema-queries";

export const usePredictionRun = (runId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(predictionRunQueryOptions(organizationId, runId));
};
