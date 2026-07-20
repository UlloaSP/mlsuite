import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSchemaDraft,
  mergeSchemaDraft,
  publishSchemaDraft,
  updateSchemaDraft,
} from "./schema-draft-api";
import type {
  CreateSchemaDraftRequest,
  SchemaDraftDto,
  SchemaDraftMergeRequest,
  UpdateSchemaDraftRequest,
} from "./draft-types";
import {
  SCHEMA_DRAFTS_QUERY_KEY,
  SCHEMA_DRAFT_DIFF_QUERY_KEY,
  SCHEMA_DRAFT_QUERY_KEY,
  SCHEMA_VERSIONS_QUERY_KEY,
} from "./schema-keys";

export function useCreateSchemaDraftMutation(schemaId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (req: CreateSchemaDraftRequest) => createSchemaDraft(schemaId, req),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, schemaId) }),
  });
}

export function useUpdateSchemaDraftMutation(draftId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (req: UpdateSchemaDraftRequest) => updateSchemaDraft(draftId, req),
    onSuccess: (draft: SchemaDraftDto) => {
      qc.setQueryData(SCHEMA_DRAFT_QUERY_KEY(organizationId, draftId), draft);
      void qc.invalidateQueries({ queryKey: SCHEMA_DRAFT_DIFF_QUERY_KEY(organizationId, draftId) });
      void qc.invalidateQueries({
        queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, draft.schemaId),
      });
    },
  });
}

export function useMergeSchemaDraftMutation(draftId: string, schemaId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (request: SchemaDraftMergeRequest) => mergeSchemaDraft(draftId, request),
    onSuccess: (result) => {
      qc.setQueryData(SCHEMA_DRAFT_QUERY_KEY(organizationId, draftId), result.draft);
      qc.setQueryData(SCHEMA_DRAFT_DIFF_QUERY_KEY(organizationId, draftId), result.diff);
      void qc.invalidateQueries({ queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, schemaId) });
    },
  });
}

export function usePublishSchemaDraftMutation(draftId: string, schemaId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (expectedDraftRevision: number) =>
      publishSchemaDraft(draftId, expectedDraftRevision),
    onSuccess: (result) => {
      qc.setQueryData(SCHEMA_DRAFT_QUERY_KEY(organizationId, draftId), result.draft);
      void qc.invalidateQueries({ queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, schemaId) });
      void qc.invalidateQueries({ queryKey: SCHEMA_VERSIONS_QUERY_KEY(organizationId, schemaId) });
    },
  });
}
