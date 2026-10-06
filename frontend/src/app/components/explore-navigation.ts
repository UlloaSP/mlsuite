/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { SECTION_ICONS } from "@/shared/ui/section-icons";
import type { NavigationItem } from "./sidebar-navigation-support";

/** The one address of the public feed. */
export const EXPLORE_PATH = "/explore";

/** Where every public page's trail starts, in the app shell and in the public frame alike. */
export const EXPLORE_BREADCRUMB_ROOT = { label: "Explore", to: EXPLORE_PATH };

/** The feed's navigation entry. It needs no permission: the pages behind it are public. */
export const EXPLORE_NAVIGATION_ITEM: NavigationItem = {
  root: EXPLORE_PATH,
  to: EXPLORE_PATH,
  icon: SECTION_ICONS.explore,
  label: "Explore",
};
