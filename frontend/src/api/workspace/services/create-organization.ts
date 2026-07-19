/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { OrganizationDto, CreateOrganizationRequest } from "@/api/workspace/dtos";

export const createOrganization = (payload: CreateOrganizationRequest): Promise<OrganizationDto> =>
  appFetch<OrganizationDto>("/api/organizations", json("POST", payload));
