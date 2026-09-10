import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useSchemaPluginCatalog as useCatalog } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";

export const useSchemaPluginCatalog = (schema: unknown) =>
  useCatalog(schema, useCurrentOrganizationId() ?? "none");
