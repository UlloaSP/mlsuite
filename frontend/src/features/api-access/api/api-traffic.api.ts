/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import type { CatalogPageRequest, UsagePeriod } from "./api-access.api";
import type {
  AdminApiClientDto,
  AdminApiOrganizationDto,
  ApiUsageDto,
  PageDtoAdminApiClientDto,
  PageDtoAdminApiOrganizationDto,
} from "@/shared/api/openapi.gen";

const TRAFFIC = "/api/admin/api-traffic";

const catalogParams = ({ page, size, search, filter, sort }: CatalogPageRequest) =>
  new URLSearchParams({
    page: String(page),
    size: String(size),
    search,
    filter,
    ...(sort ? { sort } : {}),
  }).toString();

export const getApiTrafficUsage = (
  period: UsagePeriod,
  signal?: AbortSignal,
): Promise<ApiUsageDto> => appFetch(`${TRAFFIC}/usage?period=${period}`, { signal });

export const listApiTrafficClients = (
  request: CatalogPageRequest,
  signal?: AbortSignal,
): Promise<PageDtoAdminApiClientDto> =>
  appFetch(`${TRAFFIC}/clients?${catalogParams(request)}`, { signal });

/** The organization is shown `reason` on the client. */
export const suspendApiClient = (clientId: number, reason: string): Promise<AdminApiClientDto> =>
  appFetch(`${TRAFFIC}/clients/${clientId}/suspend`, json("POST", { reason }));

export const reinstateApiClient = (clientId: number): Promise<AdminApiClientDto> =>
  appFetch(`${TRAFFIC}/clients/${clientId}/reinstate`, { method: "POST" });

export const listApiTrafficOrganizations = (
  request: CatalogPageRequest,
  signal?: AbortSignal,
): Promise<PageDtoAdminApiOrganizationDto> =>
  appFetch(`${TRAFFIC}/organizations?${catalogParams(request)}`, { signal });

/** Null returns the organization to the instance default. */
export const setApiCallLimit = (
  organizationId: number,
  monthlyCalls: number | null,
): Promise<AdminApiOrganizationDto> =>
  appFetch(`${TRAFFIC}/organizations/${organizationId}/call-limit`, json("PUT", { monthlyCalls }));
