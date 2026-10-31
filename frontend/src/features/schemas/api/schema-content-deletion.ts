import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { appFetch } from "@/shared/api/http";
import {
  ORGANIZATION_BOOKMARKS_QUERY_KEY,
  SCHEMA_BOOKMARKS_QUERY_KEY,
  SCHEMA_DRAFTS_QUERY_KEY,
  SCHEMA_VERSIONS_QUERY_KEY,
} from "./schema-keys";

type SchemaContent = "schema-drafts" | "schema-bookmarks" | "schema-versions";

/** Deletes a piece of a schema; a refusal says what still needs it, in the API's own words. */
export const useDeleteSchemaContent = (schemaId: number | string, content: SchemaContent) => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (id: number) => appFetch<void>(`/api/${content}/${id}`, { method: "DELETE" }),
    onError: (failure) => toast.error("It was not deleted", { description: failure.message }),
    onSuccess: () =>
      Promise.all(
        [
          SCHEMA_VERSIONS_QUERY_KEY(organizationId, schemaId),
          SCHEMA_DRAFTS_QUERY_KEY(organizationId, schemaId),
          SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, schemaId),
          ORGANIZATION_BOOKMARKS_QUERY_KEY(organizationId),
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
};
