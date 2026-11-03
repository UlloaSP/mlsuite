/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { choiceParam, textParam } from "@/shared/lib/search-schema";

export const INFRA_TABS = ["overview", "services", "logs", "terminal", "alerts"] as const;

/**
 * The infrastructure console: `?tab=…`, the service the overview charts, and the services
 * tab's status and health filters.
 */
export const infrastructureSearch = z.object({
  tab: choiceParam(INFRA_TABS, "overview"),
  service: textParam("all"),
  status: textParam("all"),
  health: textParam("all"),
});
