/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as modelApi from "@/api/models/services";
import { GET_MODELS_QUERY_KEY } from "./query-keys";
import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";

/** -------------------- Reads -------------------- */
export const useGetModels = () => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: GET_MODELS_QUERY_KEY(organizationId),
    queryFn: modelApi.getModels,
    gcTime: 10 * 60_000,
    retry: (count, err: any) => {
      const s = err?.status ?? err?.response?.status;
      if (s === 401 || s === 403) return false;
      return count < 2;
    },
  });
};
