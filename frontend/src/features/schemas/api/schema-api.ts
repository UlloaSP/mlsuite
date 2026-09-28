import { appFetch, json } from "@/shared/api/http";
import type { DuplicateSchemaRequest, SchemaNameRequest, SchemaPageRequest } from "./schema-types";
import type {
  CreateSchemaWithInitialVersionRequest,
  PageDtoSchemaCatalogItemDto,
  SchemaDto,
  SchemaVersionDto,
} from "@/shared/api/openapi.gen";

export const createSchemaWithInitialVersion = (
  req: CreateSchemaWithInitialVersionRequest,
): Promise<SchemaDto> =>
  appFetch<SchemaDto>("/api/schemas/with-initial-version", json("POST", req));

export const archiveSchema = (id: number | string): Promise<SchemaDto> => {
  return appFetch<SchemaDto>(`/api/schemas/${encodeURIComponent(id)}/archive`, {
    method: "POST",
  });
};

export const deleteSchema = async (id: number | string): Promise<void> => {
  await appFetch(`/api/schemas/${encodeURIComponent(id)}`, { method: "DELETE" });
};

export const duplicateSchema = ({
  id,
  name,
  versionId,
}: DuplicateSchemaRequest): Promise<SchemaDto> => {
  const params = new URLSearchParams({ name });
  if (versionId) params.set("versionId", String(versionId));
  return appFetch<SchemaDto>(
    `/api/schemas/${encodeURIComponent(id)}/duplicate?${params.toString()}`,
    { method: "POST" },
  );
};

export const getSchemaPage = (
  { page, search = "", size, sort = "updated", status = "active" }: SchemaPageRequest,
  signal?: AbortSignal,
): Promise<PageDtoSchemaCatalogItemDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
    status,
  });
  return appFetch<PageDtoSchemaCatalogItemDto>(`/api/schemas?${params.toString()}`, { signal });
};

export const getSchema = (schemaId: number | string, signal?: AbortSignal): Promise<SchemaDto> =>
  appFetch<SchemaDto>(`/api/schemas/${encodeURIComponent(schemaId)}`, { signal });

export const renameSchema = ({ id, name }: SchemaNameRequest): Promise<SchemaDto> => {
  const params = new URLSearchParams({ name });
  return appFetch<SchemaDto>(`/api/schemas/${encodeURIComponent(id)}?${params.toString()}`, {
    method: "PATCH",
  });
};

export const getSchemaVersions = (
  schemaId: number | string,
  signal?: AbortSignal,
): Promise<SchemaVersionDto[]> =>
  appFetch<SchemaVersionDto[]>(`/api/schemas/${encodeURIComponent(schemaId)}/versions`, {
    signal,
  });

export const getSchemaVersion = (
  versionId: number | string,
  signal?: AbortSignal,
): Promise<SchemaVersionDto> =>
  appFetch<SchemaVersionDto>(`/api/schema-versions/${encodeURIComponent(versionId)}`, { signal });
