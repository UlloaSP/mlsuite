/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { OrganizationDto, CreateOrganizationRequest } from "@/api/workspace/dtos";

export const createOrganization = (payload: CreateOrganizationRequest): Promise<OrganizationDto> =>
  appFetch<OrganizationDto>("/api/organizations", json("POST", payload));
