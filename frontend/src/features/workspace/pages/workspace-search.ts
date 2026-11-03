/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { catalogSearch, choiceParam, textParam } from "@/shared/lib/search-schema";

/**
 * The organizations a member belongs to (`?q=…`), or for a superadmin every organization
 * (`?q=…&sort=…`).
 */
export const organizationsSearch = z.object(
  catalogSearch(["all"], "all", ["updated", "created", "name"], "updated"),
);

/**
 * An audit log's filters: the text searched, the action, who acted (a kind or a name), the
 * target, the days it covers, and on the platform's log the organization.
 */
export const auditSearch = z.object({
  q: textParam(),
  action: textParam("all"),
  actorKind: textParam("all"),
  actor: textParam(),
  target: textParam("all"),
  from: textParam(),
  to: textParam(),
  organization: textParam("all"),
});

/** Members: `?q=…&role=<id>`. */
export const membersSearch = z.object({ q: textParam(), role: textParam("ALL") });

/** Invitations: `?q=…&status=…`. */
export const invitationsSearch = z.object({ q: textParam(), status: textParam("ALL") });

/** Roles and permissions: `?tab=…&q=…`. */
export const rolesSearch = z.object({
  tab: choiceParam(["roles", "templates", "permissions"], "roles"),
  q: textParam(),
});
