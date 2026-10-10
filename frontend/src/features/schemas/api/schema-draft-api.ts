import { appFetch, json } from "@/shared/api/http";
import type {
  SchemaDraftDto,
  SchemaDraftMergeResultDto,
  SchemaDraftPublishResultDto,
  UpdateSchemaDraftRequest,
} from "./draft-types";
import type {
  CreateSchemaDraftRequest,
  PublishSchemaDraftRequest,
  SchemaDraftDiffDto,
  SchemaDraftMergeRequest,
} from "@/shared/api/openapi.gen";

export const createSchemaDraft = (
  schemaId: number | string,
  req: CreateSchemaDraftRequest,
): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(
    `/api/schemas/${encodeURIComponent(schemaId)}/drafts`,
    json("POST", req),
  );

export const getSchemaDraft = (
  draftId: number | string,
  signal?: AbortSignal,
): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(`/api/schema-drafts/${encodeURIComponent(draftId)}`, { signal });

export const updateSchemaDraft = (
  draftId: number | string,
  req: UpdateSchemaDraftRequest,
): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(`/api/schema-drafts/${encodeURIComponent(draftId)}`, json("PUT", req));

export const getSchemaDraftDiff = (
  draftId: number | string,
  signal?: AbortSignal,
): Promise<SchemaDraftDiffDto> =>
  appFetch<SchemaDraftDiffDto>(`/api/schema-drafts/${encodeURIComponent(draftId)}/diff`, {
    signal,
  });

export const mergeSchemaDraft = (
  draftId: number | string,
  request: SchemaDraftMergeRequest,
): Promise<SchemaDraftMergeResultDto> =>
  appFetch<SchemaDraftMergeResultDto>(
    `/api/schema-drafts/${encodeURIComponent(draftId)}/merge`,
    json("POST", request),
  );

export const publishSchemaDraft = (
  draftId: number | string,
  expectedDraftRevision: number,
): Promise<SchemaDraftPublishResultDto> =>
  appFetch<SchemaDraftPublishResultDto>(
    `/api/schema-drafts/${encodeURIComponent(draftId)}/publish`,
    json("POST", { expectedDraftRevision } satisfies PublishSchemaDraftRequest),
  );
