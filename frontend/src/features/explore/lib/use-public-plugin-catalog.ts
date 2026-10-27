import { useQuery } from "@tanstack/react-query";
import { schemaNeedsPluginCatalog } from "@/capabilities/prediction-runtime/mlform/schema-plugin-requirement";
import type { PluginCatalog } from "@/capabilities/prediction-runtime/sandbox/sandbox-protocol";
import { publicPluginCatalogQueryOptions } from "@/features/explore/api/public-bookmark-api";

const NO_PLUGINS: PluginCatalog = { fields: [], reports: [] };

/**
 * The plugins a public form needs, asked for only when its schema names a kind that is not
 * built in. `ready` once the form can be drawn: at once for a form of built-in kinds.
 */
export function usePublicPluginCatalog(publicId: string, formSchema: unknown) {
  const needed = schemaNeedsPluginCatalog(formSchema);
  const query = useQuery({ ...publicPluginCatalogQueryOptions(publicId), enabled: needed });
  return {
    plugins: needed ? (query.data ?? NO_PLUGINS) : NO_PLUGINS,
    ready: !needed || query.isSuccess,
    failed: needed && query.isError,
    retry: () => void query.refetch(),
  };
}
