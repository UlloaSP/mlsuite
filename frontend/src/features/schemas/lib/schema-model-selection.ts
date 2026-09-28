import type { SchemaSourceModel } from "./merge";

export const hasModelSchema = (model: SchemaSourceModel) =>
  Array.isArray(model.inputSchema?.fields);

export function initialSchemaModels(
  models: SchemaSourceModel[],
  modelId: string | null,
): SchemaSourceModel[] {
  const model = models.find(
    (candidate) => String(candidate.id) === modelId && hasModelSchema(candidate),
  );
  return model ? [model] : [];
}
