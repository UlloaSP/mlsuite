/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const organizationQueryKey = (organizationId: number | string) =>
  ["org", organizationId] as const;
