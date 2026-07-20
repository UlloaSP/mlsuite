/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { schemasQueryOptions } from "@/api/schemas/schema-queries";
import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";

export const useSchemas = () => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(schemasQueryOptions(organizationId));
};
