import { organizationQueryKey } from "@/shared/api/organization-query-key";

export const PREDICTION_RUN_CATALOG_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "inferences"] as const;
