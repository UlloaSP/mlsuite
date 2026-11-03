/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { catalogSearch } from "@/shared/lib/search-schema";

/** The plugin catalog: `?q=…&filter=<kind>&sort=…`. */
export const pluginsSearch = z.object(
  catalogSearch(["all", "field", "report"], "all", ["updated", "name"], "updated"),
);
