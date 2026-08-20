import { appFetch, json } from "@/shared/api/http";
import type {
  CreateSchemaDraftRequest,
  SchemaDraftDiffDto,
  SchemaDraftDto,
  SchemaDraftMergeRequest,
  SchemaDraftMergeResultDto,
  SchemaDraftPublishResultDto,
  UpdateSchemaDraftRequest,
} from "./draft-types";

export const createSchemaDraft = (
  schemaId: string,
  req: CreateSchemaDraftRequest,
): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(
    `/api/schemas/${encodeURIComponent(schemaId)}/drafts`,
    json("POST", req),
  );

export const getSchemaDrafts = (
  schemaId: string,
  signal?: AbortSignal,
): Promise<SchemaDraftDto[]> =>
  appFetch<SchemaDraftDto[]>(`/api/schemas/${encodeURIComponent(schemaId)}/drafts`, { signal });

export const getSchemaDraft = (draftId: string, signal?: AbortSignal): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(`/api/schema-drafts/${encodeURIComponent(draftId)}`, { signal });

export const updateSchemaDraft = (
  draftId: string,
  req: UpdateSchemaDraftRequest,
): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(`/api/schema-drafts/${encodeURIComponent(draftId)}`, json("PUT", req));

export const getSchemaDraftDiff = (
  draftId: string,
  signal?: AbortSignal,
): Promise<SchemaDraftDiffDto> =>
  appFetch<SchemaDraftDiffDto>(`/api/schema-drafts/${encodeURIComponent(draftId)}/diff`, {
    signal,
  });

export const mergeSchemaDraft = (
  draftId: string,
  request: SchemaDraftMergeRequest,
): Promise<SchemaDraftMergeResultDto> =>
  appFetch<SchemaDraftMergeResultDto>(
    `/api/schema-drafts/${encodeURIComponent(draftId)}/merge`,
    json("POST", request),
  );

export const publishSchemaDraft = (
  draftId: string,
  expectedDraftRevision: number,
): Promise<SchemaDraftPublishResultDto> =>
  appFetch<SchemaDraftPublishResultDto>(
    `/api/schema-drafts/${encodeURIComponent(draftId)}/publish`,
    json("POST", { expectedDraftRevision }),
  );
