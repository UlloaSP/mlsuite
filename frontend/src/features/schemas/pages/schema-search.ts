/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { catalogSearch, choiceParam, optionalTextParam } from "@/shared/lib/search-schema";

/** The schemas catalog: `?q=…&filter=…&sort=…`. */
export const schemasSearch = z.object(
  catalogSearch(["active", "archived", "all"], "active", ["updated", "created", "name"], "updated"),
);

/** A schema's changes (its drafts). */
export const schemaChangesSearch = z.object(
  catalogSearch(["open", "draft", "conflict", "all"], "open", ["updated", "name", "base"], "updated"),
);

/** A schema's bookmarks. */
export const schemaBookmarksSearch = z.object(
  catalogSearch(["all", "latest", "older"], "all", ["updated", "name", "version"], "updated"),
);

/** A schema's snapshots. */
export const schemaSnapshotsSearch = z.object(
  catalogSearch(["all", "latest", "withBindings"], "all", ["created", "version", "name"], "created"),
);

/** The bookmarks a member runs from. */
export const predictSearch = z.object(
  catalogSearch(["all", "behind"], "all", ["schema", "name", "used", "recent"], "schema"),
);

export const SNAPSHOT_PREVIEW_MODES = ["form", "json", "bindings"] as const;

/** A schema or one of its snapshots, previewed as `?view=…`. */
export const schemaPreviewSearch = z.object({ view: choiceParam(SNAPSHOT_PREVIEW_MODES, "form") });

/**
 * A bookmark's workspace: `?from=<run id>` starts the form from a saved run's inputs, and
 * `?bulk=open` opens its bulk uploads.
 */
export const bookmarkWorkspaceSearch = z.object({
  from: optionalTextParam(),
  bulk: choiceParam(["closed", "open"], "closed"),
});

/** A new schema, `?modelId=<id>` starting it bound to that model. */
export const createSchemaSearch = z.object({ modelId: optionalTextParam() });

export const DRAFT_EDITOR_VIEWS = ["code", "preview"] as const;

/** The draft editor: `?view=preview` shows the form instead of its JSON. */
export const draftEditorSearch = z.object({ view: choiceParam(DRAFT_EDITOR_VIEWS, "code") });

export const RUN_DETAIL_TABS = ["inputs", "outputs", "reviews", "history"] as const;

/** A saved run's details, wherever they are shown: `?tab=…`. */
export const runDetailsSearchShape = { tab: choiceParam(RUN_DETAIL_TABS, "inputs") };
