/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { catalogSearch } from "@/shared/lib/search-schema";

/** The public bookmarks a superadmin moderates: `?q=…&sort=…`. */
export const adminPublicBookmarksSearch = z.object(
  catalogSearch(["all"], "all", ["updated", "name", "organization"], "updated"),
);

/** Purge jobs: `?q=…&filter=…`. */
export const adminPurgesSearch = z.object(
  catalogSearch(["all", "open", "completed"], "all", ["newest"], "newest"),
);

/** Accounts: `?q=…&filter=<role>&sort=…`. */
export const adminUsersSearch = z.object(
  catalogSearch(
    ["all", "USER", "SUPERADMIN"],
    "all",
    ["current", "name", "newest", "oldest"],
    "current",
  ),
);
