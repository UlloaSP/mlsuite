/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { choiceParam } from "@/shared/lib/search-schema";

/** The member's own profile: `?view=edit` opens it for editing. */
export const ownProfileSearch = z.object({ view: choiceParam(["page", "edit"], "page") });

export const SETTINGS_SECTIONS = [
  "appearance",
  "typography",
  "keybindings",
  "layout",
  "account",
] as const;

/** Settings: `?section=…`. */
export const settingsSearch = z.object({ section: choiceParam(SETTINGS_SECTIONS, "appearance") });
