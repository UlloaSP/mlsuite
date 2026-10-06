import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  archiveSchema,
  createSchemaWithInitialVersion,
  deleteSchema,
  duplicateSchema,
  renameSchema,
} from "./schema-api";
import {
  createSchemaBookmark,
  markBookmarkExample,
  publishSchemaBookmark,
  unmarkBookmarkExample,
  unpublishSchemaBookmark,
} from "./schema-bookmark-api";
import {
  ORGANIZATION_BOOKMARKS_QUERY_KEY,
  SCHEMA_BOOKMARKS_QUERY_KEY,
  SCHEMA_BOOKMARK_EXAMPLES_QUERY_KEY,
  SCHEMA_BOOKMARK_QUERY_KEY,
  SCHEMA_CATALOG_PAGE_QUERY_KEY,
} from "./schema-keys";
import type { CreateSchemaBookmarkRequest, SchemaBookmarkDto } from "@/shared/api/openapi.gen";

export const useInvalidateSchemaQueries = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SCHEMA_CATALOG_PAGE_QUERY_KEY(organizationId) }),
      // The Predict launcher shows schema names and hides archived schemas.
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_BOOKMARKS_QUERY_KEY(organizationId) }),
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

export function useCreateSchemaWithInitialVersionMutation() {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: createSchemaWithInitialVersion,
    onSuccess: () => void invalidate(),
  });
}

export function useCreateSchemaBookmarkMutation(schemaId: number | string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (req: CreateSchemaBookmarkRequest) => createSchemaBookmark(schemaId, req),
    onSuccess: (bookmark) => {
      qc.setQueryData(SCHEMA_BOOKMARK_QUERY_KEY(organizationId, bookmark.id), bookmark);
      void qc.invalidateQueries({ queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, schemaId) });
      void qc.invalidateQueries({ queryKey: ORGANIZATION_BOOKMARKS_QUERY_KEY(organizationId) });
      // Saving over an existing name moves that bookmark, which changes what its examples serve.
      void qc.invalidateQueries({
        queryKey: SCHEMA_BOOKMARK_EXAMPLES_QUERY_KEY(organizationId, bookmark.id),
      });
    },
  });
}

/** Publishes or unpublishes a bookmark; a failure is reported by the global error handler. */
export function useSetBookmarkVisibilityMutation() {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    // The row that asked says why a publication was refused.
    meta: { errorHandledLocally: true },
    mutationFn: ({
      bookmarkId,
      visibility,
    }: Pick<SchemaBookmarkDto, "visibility"> & { bookmarkId: number }) =>
      visibility === "PUBLIC"
        ? publishSchemaBookmark(bookmarkId)
        : unpublishSchemaBookmark(bookmarkId),
    onSuccess: (bookmark) => {
      qc.setQueryData(SCHEMA_BOOKMARK_QUERY_KEY(organizationId, bookmark.id), bookmark);
      void qc.invalidateQueries({
        queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, bookmark.schemaId),
      });
      // An example is served only while its bookmark is public.
      void qc.invalidateQueries({
        queryKey: SCHEMA_BOOKMARK_EXAMPLES_QUERY_KEY(organizationId, bookmark.id),
      });
    },
  });
}

/**
 * Marks or unmarks one run as a public example of a bookmark. The bookmark's own queries are
 * refreshed too, because they carry its example counts.
 */
export function useSetBookmarkExampleMutation() {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: async ({
      bookmark,
      runId,
      example,
    }: {
      bookmark: Pick<SchemaBookmarkDto, "id" | "schemaId">;
      runId: number;
      example: boolean;
    }) => {
      if (example) await markBookmarkExample(bookmark.id, runId);
      else await unmarkBookmarkExample(bookmark.id, runId);
      return bookmark;
    },
    onSuccess: (bookmark) =>
      Promise.all([
        qc.invalidateQueries({
          queryKey: SCHEMA_BOOKMARK_EXAMPLES_QUERY_KEY(organizationId, bookmark.id),
        }),
        qc.invalidateQueries({ queryKey: SCHEMA_BOOKMARK_QUERY_KEY(organizationId, bookmark.id) }),
        qc.invalidateQueries({
          queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, bookmark.schemaId),
        }),
      ]),
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
