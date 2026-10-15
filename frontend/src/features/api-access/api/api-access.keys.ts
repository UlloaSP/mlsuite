/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { organizationQueryKey } from "@/shared/api/organization-query-key";

type Scope = number | string;

/** Everything API access caches for an organization; mutations invalidate below it. */
export const API_ACCESS_QUERY_KEY = (organizationId: Scope) =>
  [...organizationQueryKey(organizationId), "apiAccess"] as const;
export const API_CLIENTS_QUERY_KEY = (organizationId: Scope) =>
  [...API_ACCESS_QUERY_KEY(organizationId), "clients"] as const;
export const API_CLIENT_QUERY_KEY = (organizationId: Scope, clientId: Scope) =>
  [...API_ACCESS_QUERY_KEY(organizationId), "client", { clientId: String(clientId) }] as const;
export const API_ACCESS_BOOKMARKS_QUERY_KEY = (organizationId: Scope) =>
  [...API_ACCESS_QUERY_KEY(organizationId), "bookmarks"] as const;
export const API_REQUESTS_QUERY_KEY = (organizationId: Scope) =>
  [...API_ACCESS_QUERY_KEY(organizationId), "requests"] as const;
export const API_USAGE_QUERY_KEY = (organizationId: Scope) =>
  [...API_ACCESS_QUERY_KEY(organizationId), "usage"] as const;
export const API_DOCUMENTED_MODEL_QUERY_KEY = (organizationId: Scope, modelId: Scope) =>
  [...API_ACCESS_QUERY_KEY(organizationId), "model", { modelId: String(modelId) }] as const;
