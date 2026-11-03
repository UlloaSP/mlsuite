/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { catalogSearch } from "@/shared/lib/search-schema";

/** The public feed: `?q=…&sort=…`. */
export const exploreSearch = z.object(
  catalogSearch(["all"], "all", ["updated", "name"], "updated"),
);
