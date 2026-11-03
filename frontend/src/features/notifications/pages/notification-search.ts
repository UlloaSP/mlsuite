/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { choiceParam } from "@/shared/lib/search-schema";

/** The inbox: `?filter=unread` keeps only what is unread. */
export const notificationsSearch = z.object({ filter: choiceParam(["all", "unread"], "all") });
