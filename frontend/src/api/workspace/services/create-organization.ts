/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { OrganizationDto, CreateOrganizationRequest } from "../dtos";

export const createOrganization = (payload: CreateOrganizationRequest): Promise<OrganizationDto> =>
  appFetch<OrganizationDto>("/api/organizations", json("POST", payload));
