/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import { SCHEMAS_QUERY_KEY } from "./query-keys";
import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";

export const useSchemas = () => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: SCHEMAS_QUERY_KEY(organizationId),
    queryFn: schemaApi.getSchemas,
  });
};
