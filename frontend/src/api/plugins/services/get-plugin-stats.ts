/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { PluginStatsDto } from "@/api/plugins/dtos";

export const getPluginStats = async (signal?: AbortSignal): Promise<PluginStatsDto> =>
  appFetch<PluginStatsDto>("/api/plugins/stats", { signal });
