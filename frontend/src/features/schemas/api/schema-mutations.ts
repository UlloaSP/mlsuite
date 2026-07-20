import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  archiveSchema,
  createSchema,
  deleteSchema,
  duplicateSchema,
  renameSchema,
} from "./schema-api";
import { createSchemaBookmark } from "./schema-bookmark-api";
import type { CreateSchemaBookmarkRequest } from "./schema-types";
import {
  SCHEMA_BOOKMARKS_QUERY_KEY,
  SCHEMA_BOOKMARK_QUERY_KEY,
  SCHEMA_CATALOG_PAGE_QUERY_KEY,
  SCHEMAS_QUERY_KEY,
} from "./schema-keys";

export const useInvalidateSchemaQueries = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SCHEMAS_QUERY_KEY(organizationId) }),
      queryClient.invalidateQueries({ queryKey: SCHEMA_CATALOG_PAGE_QUERY_KEY(organizationId) }),
    ]);
  };
};

export const useArchiveSchemaMutation = () => {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: archiveSchema,
    onSuccess: () => void invalidate(),
  });
};

export const useDeleteSchemaMutation = () => {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: deleteSchema,
    onSuccess: () => void invalidate(),
  });
};

export const useDuplicateSchemaMutation = () => {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: duplicateSchema,
    onSuccess: () => void invalidate(),
  });
};

export function useCreateSchemaMutation() {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: createSchema,
    onSuccess: () => void invalidate(),
  });
}

export function useCreateSchemaBookmarkMutation(schemaId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (req: CreateSchemaBookmarkRequest) => createSchemaBookmark(schemaId, req),
    onSuccess: (bookmark) => {
      qc.setQueryData(SCHEMA_BOOKMARK_QUERY_KEY(organizationId, bookmark.id), bookmark);
      void qc.invalidateQueries({ queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, schemaId) });
    },
  });
}

export const useRenameSchemaMutation = () => {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: renameSchema,
    onSuccess: () => void invalidate(),
  });
};
