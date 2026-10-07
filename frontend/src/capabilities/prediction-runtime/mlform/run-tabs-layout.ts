/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { adoptShadowRules } from "@/capabilities/prediction-runtime/mlform/shadow-rules";

const RESULTS_TAB = "results";

/** The tabs view MLForm attaches to its host element in tabs layout. */
type TabsHost = HTMLElement & { view?: { setActiveTab: (tabId: string) => void } };

/** Inputs in one tab, model results in the other (when the schema has reports). */
export const runTabsLayout = (fieldIds: string[], reportIds: string[]) => ({
  kind: "tabs" as const,
  tabs: [
    {
      id: "inputs",
      title: "Inputs",
      children: fieldIds.map((field) => ({ kind: "field" as const, field })),
    },
    ...(reportIds.length > 0
      ? [
          {
            id: RESULTS_TAB,
            title: "Results",
            children: reportIds.map((report) => ({ kind: "report" as const, report })),
          },
        ]
      : []),
  ],
});

export const showRunResults = (host: HTMLElement) =>
  (host as TabsHost).view?.setActiveTab(RESULTS_TAB);

/**
 * MLForm's tabs repeat each tab's title as a heading inside the panel ("Inputs"
 * under the "Inputs" tab). Cosmetic only; the duplicate heading is harmless.
 */
export const hideRunTabTitles = (host: HTMLElement) =>
  adoptShadowRules(host, ".tab-header { display: none; }");
