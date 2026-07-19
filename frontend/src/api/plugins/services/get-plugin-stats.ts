/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { PluginStatsDto } from "@/api/plugins/dtos";

export const getPluginStats = async (): Promise<PluginStatsDto> =>
  appFetch<PluginStatsDto>("/api/plugins/stats");
