import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { mutationOptions, useMutation } from "@tanstack/react-query";
import {
  createSchemaDraft,
  mergeSchemaDraft,
  publishSchemaDraft,
  updateSchemaDraft,
} from "./schema-draft-api";
import type { SchemaDraftDto, UpdateSchemaDraftRequest } from "./draft-types";
import {
  SCHEMA_BOOKMARKS_QUERY_KEY,
  SCHEMA_DRAFTS_QUERY_KEY,
  SCHEMA_DRAFT_DIFF_QUERY_KEY,
  SCHEMA_DRAFT_QUERY_KEY,
  SCHEMA_VERSIONS_QUERY_KEY,
} from "./schema-keys";
import type { CreateSchemaDraftRequest, SchemaDraftMergeRequest } from "@/shared/api/openapi.gen";

type OrganizationKey = number | string;

const createSchemaDraftMutation = (organizationId: OrganizationKey, schemaId: number | string) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn: (req: CreateSchemaDraftRequest) => createSchemaDraft(schemaId, req),
    onSuccess: (_draft, _req, _result, { client }) =>
      client.invalidateQueries({ queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, schemaId) }),
  });

export const useCreateSchemaDraftMutation = (schemaId: number | string) =>
  useMutation(createSchemaDraftMutation(useCurrentOrganizationId() ?? "none", schemaId));

const updateSchemaDraftMutation = (organizationId: OrganizationKey, draftId: number | string) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn: (req: UpdateSchemaDraftRequest) => updateSchemaDraft(draftId, req),
    onSuccess: (draft: SchemaDraftDto, _req, _result, { client }) => {
      client.setQueryData(SCHEMA_DRAFT_QUERY_KEY(organizationId, draftId), draft);
      void client.invalidateQueries({
        queryKey: SCHEMA_DRAFT_DIFF_QUERY_KEY(organizationId, draftId),
      });
      void client.invalidateQueries({
        queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, draft.schemaId),
      });
    },
  });

export const useUpdateSchemaDraftMutation = (draftId: number | string) =>
  useMutation(updateSchemaDraftMutation(useCurrentOrganizationId() ?? "none", draftId));

const mergeSchemaDraftMutation = (
  organizationId: OrganizationKey,
  draftId: number | string,
  schemaId: number | string,
) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn: (request: SchemaDraftMergeRequest) => mergeSchemaDraft(draftId, request),
    onSuccess: (merged, _request, _result, { client }) => {
      client.setQueryData(SCHEMA_DRAFT_QUERY_KEY(organizationId, draftId), merged.draft);
      client.setQueryData(SCHEMA_DRAFT_DIFF_QUERY_KEY(organizationId, draftId), merged.diff);
      void client.invalidateQueries({
        queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, schemaId),
      });
    },
  });

export const useMergeSchemaDraftMutation = (draftId: number | string, schemaId: number | string) =>
  useMutation(mergeSchemaDraftMutation(useCurrentOrganizationId() ?? "none", draftId, schemaId));

const publishSchemaDraftMutation = (
  organizationId: OrganizationKey,
  draftId: number | string,
  schemaId: number | string,
) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn: (expectedDraftRevision: number) =>
      publishSchemaDraft(draftId, expectedDraftRevision),
    onSuccess: (published, _revision, _result, { client }) => {
      client.setQueryData(SCHEMA_DRAFT_QUERY_KEY(organizationId, draftId), published.draft);
      void client.invalidateQueries({
        queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, schemaId),
      });
      void client.invalidateQueries({
        queryKey: SCHEMA_VERSIONS_QUERY_KEY(organizationId, schemaId),
      });
      // A new snapshot changes which bookmarks point at the latest one.
      void client.invalidateQueries({
        queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, schemaId),
      });
    },
  });

export const usePublishSchemaDraftMutation = (
  draftId: number | string,
  schemaId: number | string,
) =>
  useMutation(publishSchemaDraftMutation(useCurrentOrganizationId() ?? "none", draftId, schemaId));
