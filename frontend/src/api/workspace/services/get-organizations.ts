/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { OrganizationDto } from "@/api/workspace/dtos";

export const getOrganizations = (): Promise<OrganizationDto[]> =>
  appFetch<OrganizationDto[]>("/api/organizations");
