/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type * as Api from "@/shared/api/openapi.gen";
import type { JsonRecord } from "./schema-types";

/**
 * The API stores draft bindings as free-form JSON and publishes whatever it holds, so the spec
 * leaves them untyped. This is the shape the editor writes; older drafts may hold string ids.
 */
export type SchemaDraftBindingDto = {
  modelId: string | number;
  modelName?: string;
  pluginPolicy?: JsonRecord;
};

type WithBindings<T> = Omit<T, "bindings"> & { bindings: SchemaDraftBindingDto[] };

export type SchemaDraftDto = WithBindings<Api.SchemaDraftDto>;

export type UpdateSchemaDraftRequest = WithBindings<Api.UpdateSchemaDraftRequest>;

export type SchemaDraftMergeSide = Api.SchemaDraftMergeResolutionDto["side"];

export type SchemaDraftMergeResultDto = Omit<Api.SchemaDraftMergeResultDto, "draft"> & {
  draft: SchemaDraftDto;
};

export type SchemaDraftPublishResultDto = Omit<Api.SchemaDraftPublishResultDto, "draft"> & {
  draft: SchemaDraftDto;
};
