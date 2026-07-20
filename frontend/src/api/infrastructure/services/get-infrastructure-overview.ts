/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { InfrastructureOverviewDto } from "@/api/infrastructure/dtos";

export const getInfrastructureOverview = (signal?: AbortSignal) =>
  appFetch<InfrastructureOverviewDto>("/api/admin/infrastructure/overview", { signal });
