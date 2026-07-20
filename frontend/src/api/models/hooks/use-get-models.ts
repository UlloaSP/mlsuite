/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { modelsQueryOptions } from "@/api/models/model-queries";
import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";

/** -------------------- Reads -------------------- */
export const useGetModels = () => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    ...modelsQueryOptions(organizationId),
    retry: (count, err: any) => {
      const s = err?.status ?? err?.response?.status;
      if (s === 401 || s === 403) return false;
      return count < 2;
    },
  });
};
