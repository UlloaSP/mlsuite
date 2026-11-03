/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mutationOptions, queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import type { CatalogPageRequest, UsagePeriod } from "./api-access.api";
import {
  getApiTrafficUsage,
  listApiTrafficClients,
  listApiTrafficOrganizations,
  reinstateApiClient,
  setApiCallLimit,
  suspendApiClient,
} from "./api-traffic.api";

/** The platform's traffic belongs to no organization. */
const API_TRAFFIC_QUERY_KEY = ["admin", "apiTraffic"] as const;
const CLIENTS = [...API_TRAFFIC_QUERY_KEY, "clients"] as const;
const ORGANIZATIONS = [...API_TRAFFIC_QUERY_KEY, "organizations"] as const;

type Request = Omit<CatalogPageRequest, "page">;

export const apiTrafficUsageQueryOptions = (period: UsagePeriod) =>
  queryOptions({
    queryKey: [...API_TRAFFIC_QUERY_KEY, "usage", period],
    queryFn: ({ signal }) => getApiTrafficUsage(period, signal),
  });

export const useApiTrafficUsage = (period: UsagePeriod, enabled: boolean) =>
  useQuery({ ...apiTrafficUsageQueryOptions(period), enabled });

export const useApiTrafficClients = (request: Request) =>
  useInfiniteCatalog({
    queryKey: [...CLIENTS, "infinite", request.size, request.search, request.filter, request.sort],
    queryFn: (page, signal) => listApiTrafficClients({ ...request, page }, signal),
  });

export const useApiTrafficOrganizations = (request: Request) =>
  useInfiniteCatalog({
    queryKey: [...ORGANIZATIONS, "infinite", request.size, request.search],
    queryFn: (page, signal) => listApiTrafficOrganizations({ ...request, page }, signal),
    itemId: (item) => item.organizationId,
  });

/** Suspending or reinstating changes the client's row and the platform's numbers. */
const apiClientStatusMutation = mutationOptions({
  meta: { errorHandledLocally: true },
  mutationFn: ({ clientId, reason }: { clientId: number; reason: string | null }) =>
    reason === null ? reinstateApiClient(clientId) : suspendApiClient(clientId, reason),
  onSuccess: (_data, _variables, _result, { client }) =>
    client.invalidateQueries({ queryKey: API_TRAFFIC_QUERY_KEY }),
});

export const useApiClientStatusMutation = () => useMutation(apiClientStatusMutation);

const apiCallLimitMutation = mutationOptions({
  meta: { errorHandledLocally: true },
  mutationFn: ({
    organizationId,
    monthlyCalls,
  }: {
    organizationId: number;
    monthlyCalls: number | null;
  }) => setApiCallLimit(organizationId, monthlyCalls),
  onSuccess: (_data, _variables, _result, { client }) =>
    client.invalidateQueries({ queryKey: ORGANIZATIONS }),
});

export const useApiCallLimitMutation = () => useMutation(apiCallLimitMutation);
