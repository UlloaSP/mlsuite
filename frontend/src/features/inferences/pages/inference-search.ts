/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { catalogSearch, choiceParam, textParam } from "@/shared/lib/search-schema";

/**
 * The inference table: `?q=…` and its filters. `where` holds column conditions and `sort` a
 * column and direction; the page reads both.
 */
export const inferencesSearch = z.object({
  q: textParam(),
  schema: textParam("all"),
  bookmark: textParam("all"),
  status: choiceParam(["all", "SUCCESS", "PARTIAL_SUCCESS", "FAILED"], "all"),
  feedback: choiceParam(["all", "COMPLETED", "PENDING", "NOT_REQUIRED"], "all"),
  origin: choiceParam(["all", "WORKSPACE", "PUBLIC", "API"], "all"),
  where: textParam(),
  sort: textParam("createdAt.desc"),
});

/**
 * An inference's own params: `?section=reviews` opens its reviews, and the catalog params of its
 * reviewers. The app adds the params of the run details it shows.
 */
export const inferenceDetailSearchShape = {
  section: z.literal("reviews").optional().catch(undefined),
  ...catalogSearch(
    ["all", "completed", "in-progress", "pending"],
    "all",
    ["requested", "submitted", "reviewer"],
    "requested",
  ),
};
