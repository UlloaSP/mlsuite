/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { catalogSearch, choiceParam } from "@/shared/lib/search-schema";

export const MODEL_STATUS_FILTERS = ["active", "archived", "all"] as const;
export const MODEL_SORTS = ["updated", "name", "algorithm"] as const;

/** The models catalog's address: `?q=…&filter=…&sort=…`. */
export const modelsSearch = z.object(
  catalogSearch(MODEL_STATUS_FILTERS, "active", MODEL_SORTS, "updated"),
);

export const MODEL_DETAIL_TABS = [
  "overview",
  "inputs",
  "outputs",
  "parameters",
  "provenance",
] as const;

/** A model's page: `?tab=…`, one tab per question its bundle answers. */
export const modelDetailSearch = z.object({ tab: choiceParam(MODEL_DETAIL_TABS, "overview") });
