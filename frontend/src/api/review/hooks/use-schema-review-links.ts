/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as api from "../services";
import { SCHEMA_REVIEW_LINKS_QUERY_KEY } from "./query-keys";

export const useSchemaReviewLinks = (schemaId: string, versionId: string) =>
  useQuery({
    queryKey: SCHEMA_REVIEW_LINKS_QUERY_KEY(schemaId, versionId),
    queryFn: () => api.listSchemaReviewLinks(schemaId, versionId),
    enabled: Boolean(schemaId && versionId),
    placeholderData: [],
  });
