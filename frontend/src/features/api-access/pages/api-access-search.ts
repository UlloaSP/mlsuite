/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { USAGE_PERIODS } from "@/features/api-access/api/api-access.api";
import { catalogSearch, choiceParam, textParam } from "@/shared/lib/search-schema";

const period = choiceParam(USAGE_PERIODS, "day");

/** The request log's search and outcome, shared by every page that shows it. */
export const REQUEST_OUTCOMES = ["all", "succeeded", "errors", "rejected", "failed"] as const;
const requestLog = catalogSearch(REQUEST_OUTCOMES, "all", ["newest"], "newest");

/** The organization's API usage: `?period=…`. */
export const apiOverviewSearch = z.object({ period });

/** Its clients: `?q=…&filter=…&sort=…`. */
export const apiClientsSearch = z.object(
  catalogSearch(["all", "active", "suspended"], "all", ["updated", "name", "created"], "updated"),
);

export const API_CLIENT_TABS = ["overview", "keys", "access", "requests", "settings"] as const;

/** One client: `?tab=…&period=…`, and the request log's params on its requests tab. */
export const apiClientSearch = z.object({
  tab: choiceParam(API_CLIENT_TABS, "overview"),
  period,
  ...requestLog,
});

/** Every client's requests: the request log's params. */
export const apiRequestsSearch = z.object(requestLog);

/** The API reference, for the bookmark it documents: `?bookmark=<id>`. */
export const apiDocsSearch = z.object({ bookmark: textParam() });

export const API_TRAFFIC_TABS = ["overview", "clients", "organizations"] as const;

/** The platform's traffic: `?tab=…&period=…`, and the catalog params of its clients tab. */
export const apiTrafficSearch = z.object({
  tab: choiceParam(API_TRAFFIC_TABS, "overview"),
  period,
  ...catalogSearch(["all", "active", "suspended"], "all", ["updated", "name", "organization"], "updated"),
});
