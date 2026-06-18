/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { InfrastructureOverviewDto } from "../dtos";

export const getInfrastructureOverview = () =>
  appFetch<InfrastructureOverviewDto>("/api/admin/infrastructure/overview");
