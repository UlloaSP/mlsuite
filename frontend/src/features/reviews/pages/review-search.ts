/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { catalogSearch } from "@/shared/lib/search-schema";

/** The reviews a manager runs: `?q=…&filter=…`. */
export const reviewManageSearch = z.object(
  catalogSearch(["all", "open", "expired", "empty"], "all", ["newest"], "newest"),
);
