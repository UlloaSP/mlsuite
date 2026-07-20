/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQuery } from "@tanstack/react-query";
import { schemaVersionsQueryOptions } from "@/api/schemas/schema-queries";

export const useSchemaVersions = (schemaId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    ...schemaVersionsQueryOptions(organizationId, schemaId),
    placeholderData: [],
  });
};
