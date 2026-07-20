/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import { PREDICTION_RUN_QUERY_KEY } from "./query-keys";

export const usePredictionRun = (runId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: PREDICTION_RUN_QUERY_KEY(organizationId, runId ?? ""),
    queryFn: () => schemaApi.getPredictionRun(runId ?? ""),
    enabled: Boolean(runId),
  });
};
