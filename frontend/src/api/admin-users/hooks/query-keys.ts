/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const ADMIN_USERS_QUERY_KEY = ["adminUsers"];

export const adminUsersPageQueryKey = (page: number, search: string, sort: string, role: string) =>
  [...ADMIN_USERS_QUERY_KEY, page, search, sort, role] as const;
