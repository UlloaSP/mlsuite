/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { schemaReviewLinksQueryOptions } from "@/api/review/review-queries";

export const useSchemaReviewLinks = (schemaId: string, versionId: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    ...schemaReviewLinksQueryOptions(organizationId, schemaId, versionId),
    placeholderData: [],
  });
};
