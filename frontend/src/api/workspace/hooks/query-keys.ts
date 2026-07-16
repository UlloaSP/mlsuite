/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const WORKSPACE_CONTEXT_QUERY_KEY = ["workspaceContext"] as const;
export const PENDING_INVITATIONS_QUERY_KEY = ["pendingInvitations"] as const;
export const ORGANIZATIONS_QUERY_KEY = ["organizations"] as const;
export const ORGANIZATION_CATALOG_PAGE_SIZE = 24;
export const ORGANIZATION_CATALOG_PAGE_QUERY_KEY = ["organizationCatalogPages"] as const;

export const organizationCatalogPageQueryKey = (
  page: number,
  search: string,
  sort: string,
  filter: string,
) => [
  ...ORGANIZATION_CATALOG_PAGE_QUERY_KEY,
  page,
  ORGANIZATION_CATALOG_PAGE_SIZE,
  search,
  sort,
  filter,
];
