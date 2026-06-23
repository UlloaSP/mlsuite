/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../services";
import { SCHEMA_REVIEW_LINKS_QUERY_KEY } from "./query-keys";

export function useCreateSchemaReviewLinkMutation(schemaId: string, versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createSchemaReviewLink,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: SCHEMA_REVIEW_LINKS_QUERY_KEY(schemaId, versionId) }),
  });
}
