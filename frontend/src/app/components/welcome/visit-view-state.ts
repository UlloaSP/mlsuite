/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { enumLabel } from "@/shared/ui/AppBadge";

/** One piece of the view a page was left in ("Search: risk", "Page: 3"). */
export type ViewStateFact = { label: string; value: string };

const LABELS: Record<string, string> = {
  q: "Search",
  query: "Search",
  filter: "Filter",
  status: "Status",
  reviewStatus: "Review status",
  feedback: "Feedback",
  date: "Date",
  sort: "Sort",
  tab: "Tab",
  view: "View",
  page: "Page",
};

/** Parameters that are ids or plumbing, meaningless to a person. */
const HIDDEN = new Set(["schema", "bookmark", "from", "section", "returnTo"]);

const humanize = (value: string) => {
  const spaced = value.replace(/[-_]+/g, " ").trim();
  const formatted = enumLabel(value) !== value ? enumLabel(value) : spaced;
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

/**
 * The view state a page kept in its URL (search, filters, sort, tab, page),
 * read back as labelled facts. Defaults are left out of URLs, so everything
 * here is something the member chose.
 */
export function visitViewState(href: string): ViewStateFact[] {
  const search = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
  return [...new URLSearchParams(search)]
    .filter(([key, value]) => value !== "" && !HIDDEN.has(key))
    .map(([key, value]) => ({
      label: LABELS[key] ?? humanize(key),
      value: key === "q" || key === "query" ? `“${value}”` : humanize(value),
    }));
}
