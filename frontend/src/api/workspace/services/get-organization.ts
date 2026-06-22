/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { OrganizationDto } from "../dtos";

export const getOrganization = (organizationId: number): Promise<OrganizationDto> =>
  appFetch<OrganizationDto>(`/api/organizations/${organizationId}`);
