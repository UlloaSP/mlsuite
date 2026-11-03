import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { mutationOptions, useMutation, type QueryClient } from "@tanstack/react-query";
import { PREDICTION_RUN_CATALOG_QUERY_KEY } from "@/capabilities/prediction-runs/prediction-run-keys";
import {
  archiveSchema,
  createSchemaWithInitialVersion,
  deleteSchema,
  duplicateSchema,
  renameSchema,
  restoreSchema,
} from "./schema-api";
import {
  createSchemaBookmark,
  markBookmarkExample,
  publishSchemaBookmark,
  unmarkBookmarkExample,
  unpublishSchemaBookmark,
  updateSchemaBookmark,
} from "./schema-bookmark-api";
import {
  ORGANIZATION_BOOKMARKS_QUERY_KEY,
  SCHEMA_BOOKMARKS_QUERY_KEY,
  SCHEMA_BOOKMARK_EXAMPLES_QUERY_KEY,
  SCHEMA_BOOKMARK_QUERY_KEY,
  SCHEMA_CATALOG_PAGE_QUERY_KEY,
} from "./schema-keys";
import type {
  CreateSchemaBookmarkRequest,
  SchemaBookmarkDto,
  UpdateSchemaBookmarkRequest,
} from "@/shared/api/openapi.gen";

type OrganizationKey = number | string;

const useOrganizationKey = () => useCurrentOrganizationId() ?? "none";

const invalidateSchemaQueries = async (client: QueryClient, organizationId: OrganizationKey) => {
  await Promise.all([
    client.invalidateQueries({ queryKey: SCHEMA_CATALOG_PAGE_QUERY_KEY(organizationId) }),
    // The Predict launcher shows schema names and hides archived schemas.
    client.invalidateQueries({ queryKey: ORGANIZATION_BOOKMARKS_QUERY_KEY(organizationId) }),
  ]);
};

/** A change to a schema itself: the dialog that asked shows a refusal. */
const schemaMutation = <TData, TVariables>(
  organizationId: OrganizationKey,
  mutationFn: (variables: TVariables) => Promise<TData>,
) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn,
    onSuccess: (_data, _variables, _result, { client }) =>
      void invalidateSchemaQueries(client, organizationId),
  });

export const useArchiveSchemaMutation = () =>
  useMutation(schemaMutation(useOrganizationKey(), archiveSchema));

export const useRestoreSchemaMutation = () =>
  useMutation(schemaMutation(useOrganizationKey(), restoreSchema));

export const useDeleteSchemaMutation = () =>
  useMutation(schemaMutation(useOrganizationKey(), deleteSchema));

export const useDuplicateSchemaMutation = () =>
  useMutation(schemaMutation(useOrganizationKey(), duplicateSchema));

export const useCreateSchemaWithInitialVersionMutation = () =>
  useMutation(schemaMutation(useOrganizationKey(), createSchemaWithInitialVersion));

export const useRenameSchemaMutation = () =>
  useMutation(schemaMutation(useOrganizationKey(), renameSchema));

const createSchemaBookmarkMutation = (organizationId: OrganizationKey, schemaId: number | string) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn: (req: CreateSchemaBookmarkRequest) => createSchemaBookmark(schemaId, req),
    onSuccess: (bookmark, _req, _result, { client }) => {
      client.setQueryData(SCHEMA_BOOKMARK_QUERY_KEY(organizationId, bookmark.id), bookmark);
      void client.invalidateQueries({
        queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, schemaId),
      });
      void client.invalidateQueries({ queryKey: ORGANIZATION_BOOKMARKS_QUERY_KEY(organizationId) });
      // Saving over an existing name moves that bookmark, which changes what its examples serve.
      void client.invalidateQueries({
        queryKey: SCHEMA_BOOKMARK_EXAMPLES_QUERY_KEY(organizationId, bookmark.id),
      });
    },
  });

export const useCreateSchemaBookmarkMutation = (schemaId: number | string) =>
  useMutation(createSchemaBookmarkMutation(useOrganizationKey(), schemaId));

/** Renames a bookmark and replaces its description; the dialog that asked shows a refusal. */
const updateSchemaBookmarkMutation = (organizationId: OrganizationKey) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn: ({ bookmarkId, ...req }: UpdateSchemaBookmarkRequest & { bookmarkId: number }) =>
      updateSchemaBookmark(bookmarkId, req),
    onSuccess: (bookmark, _variables, _result, { client }) => {
      client.setQueryData(SCHEMA_BOOKMARK_QUERY_KEY(organizationId, bookmark.id), bookmark);
      void client.invalidateQueries({
        queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, bookmark.schemaId),
      });
      // The Predict launcher and the inferences name the bookmark.
      void client.invalidateQueries({ queryKey: ORGANIZATION_BOOKMARKS_QUERY_KEY(organizationId) });
      void client.invalidateQueries({ queryKey: PREDICTION_RUN_CATALOG_QUERY_KEY(organizationId) });
    },
  });

export const useUpdateSchemaBookmarkMutation = () =>
  useMutation(updateSchemaBookmarkMutation(useOrganizationKey()));

/** Publishes or unpublishes a bookmark. */
const setBookmarkVisibilityMutation = (organizationId: OrganizationKey) =>
  mutationOptions({
    // The row that asked says why a publication was refused.
    meta: { errorHandledLocally: true },
    mutationFn: ({
      bookmarkId,
      visibility,
    }: Pick<SchemaBookmarkDto, "visibility"> & { bookmarkId: number }) =>
      visibility === "PUBLIC"
        ? publishSchemaBookmark(bookmarkId)
        : unpublishSchemaBookmark(bookmarkId),
    onSuccess: (bookmark, _variables, _result, { client }) => {
      client.setQueryData(SCHEMA_BOOKMARK_QUERY_KEY(organizationId, bookmark.id), bookmark);
      void client.invalidateQueries({
        queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, bookmark.schemaId),
      });
      // An example is served only while its bookmark is public.
      void client.invalidateQueries({
        queryKey: SCHEMA_BOOKMARK_EXAMPLES_QUERY_KEY(organizationId, bookmark.id),
      });
    },
  });

export const useSetBookmarkVisibilityMutation = () =>
  useMutation(setBookmarkVisibilityMutation(useOrganizationKey()));

/**
 * Marks or unmarks one run as a public example of a bookmark. The bookmark's own queries are
 * refreshed too, because they carry its example counts.
 */
const setBookmarkExampleMutation = (organizationId: OrganizationKey) =>
  mutationOptions({
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
    onSuccess: (bookmark, _variables, _result, { client }) =>
      Promise.all([
        client.invalidateQueries({
          queryKey: SCHEMA_BOOKMARK_EXAMPLES_QUERY_KEY(organizationId, bookmark.id),
        }),
        client.invalidateQueries({
          queryKey: SCHEMA_BOOKMARK_QUERY_KEY(organizationId, bookmark.id),
        }),
        client.invalidateQueries({
          queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, bookmark.schemaId),
        }),
      ]),
  });

export const useSetBookmarkExampleMutation = () =>
  useMutation(setBookmarkExampleMutation(useOrganizationKey()));
