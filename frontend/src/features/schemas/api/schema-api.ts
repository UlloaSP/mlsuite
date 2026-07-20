import { appFetch, json } from "@/shared/api/http";
import type {
  CreateSchemaRequest,
  CreateSchemaVersionRequest,
  DuplicateSchemaRequest,
  SchemaDto,
  SchemaNameRequest,
  SchemaPageDto,
  SchemaPageRequest,
  SchemaVersionDto,
} from "./schema-types";

export const createSchema = (req: CreateSchemaRequest): Promise<SchemaDto> =>
  appFetch<SchemaDto>("/api/schemas", json("POST", req));

export const archiveSchema = (id: string): Promise<SchemaDto> => {
  return appFetch<SchemaDto>(`/api/schemas/${encodeURIComponent(id)}/archive`, {
    method: "POST",
  });
};

export const deleteSchema = async (id: string): Promise<void> => {
  await appFetch(`/api/schemas/${encodeURIComponent(id)}`, { method: "DELETE" });
};

export const duplicateSchema = ({
  id,
  name,
  versionId,
}: DuplicateSchemaRequest): Promise<SchemaDto> => {
  const params = new URLSearchParams({ name });
  if (versionId) params.set("versionId", versionId);
  return appFetch<SchemaDto>(
    `/api/schemas/${encodeURIComponent(id)}/duplicate?${params.toString()}`,
    { method: "POST" },
  );
};

export const getSchemaPage = (
  { page, search = "", size, sort = "updated", status = "active" }: SchemaPageRequest,
  signal?: AbortSignal,
): Promise<SchemaPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
    status,
  });
  return appFetch<SchemaPageDto>(`/api/schemas?${params.toString()}`, { signal });
};

export const getSchema = (schemaId: string, signal?: AbortSignal): Promise<SchemaDto> =>
  appFetch<SchemaDto>(`/api/schemas/${encodeURIComponent(schemaId)}`, { signal });

export const renameSchema = ({ id, name }: SchemaNameRequest): Promise<SchemaDto> => {
  const params = new URLSearchParams({ name });
  return appFetch<SchemaDto>(`/api/schemas/${encodeURIComponent(id)}?${params.toString()}`, {
    method: "PATCH",
  });
};

export const createSchemaVersion = (
  schemaId: string,
  req: CreateSchemaVersionRequest,
): Promise<SchemaVersionDto> =>
  appFetch<SchemaVersionDto>(
    `/api/schemas/${encodeURIComponent(schemaId)}/versions`,
    json("POST", req),
  );

export const getSchemaVersions = (
  schemaId: string,
  signal?: AbortSignal,
): Promise<SchemaVersionDto[]> =>
  appFetch<SchemaVersionDto[]>(`/api/schemas/${encodeURIComponent(schemaId)}/versions`, {
    signal,
  });

export const getSchemaVersion = (
  versionId: string,
  signal?: AbortSignal,
): Promise<SchemaVersionDto> =>
  appFetch<SchemaVersionDto>(`/api/schema-versions/${encodeURIComponent(versionId)}`, { signal });
