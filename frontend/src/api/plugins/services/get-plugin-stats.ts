/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { PluginStatsDto } from "../dtos";

export const getPluginStats = async (): Promise<PluginStatsDto> =>
  appFetch<PluginStatsDto>("/api/plugins/stats");
