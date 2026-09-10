import type { SchemaSourceModel, SelectedSchemaModel } from "./merge";

export const hasModelSchema = (model: SchemaSourceModel) =>
  Array.isArray(model.inputSchema?.fields);

export function initialSchemaModels(
  models: SchemaSourceModel[],
  modelId: string | null,
): SelectedSchemaModel[] {
  const model = models.find(
    (candidate) => String(candidate.id) === modelId && hasModelSchema(candidate),
  );
  return model ? [{ modelId: model.id, modelName: model.name, model }] : [];
}
