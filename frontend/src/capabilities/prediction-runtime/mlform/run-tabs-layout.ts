/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const RESULTS_TAB = "results";
const RUN_WITHHELD = "data-run-withheld";

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
 * Adds rules to the tabs element's shadow root, for what the kit exposes no option or part
 * for. Skipped where stylesheets can't be built (jsdom).
 */
const adoptRules = (host: HTMLElement, rules: string) => {
  const root = host.shadowRoot;
  if (
    !root ||
    typeof CSSStyleSheet === "undefined" ||
    !("replaceSync" in CSSStyleSheet.prototype)
  ) {
    return;
  }
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(rules);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
  } catch {
    // The form works without the rules.
  }
};

/**
 * MLForm's tabs repeat each tab's title as a heading inside the panel ("Inputs"
 * under the "Inputs" tab). Cosmetic only; the duplicate heading is harmless.
 */
export const hideRunTabTitles = (host: HTMLElement) =>
  adoptRules(host, ".tab-header { display: none; }");

/**
 * The kit always draws its submit action. A form whose run can be withheld hides the action
 * while its host carries an attribute, which `withholdRun` sets and clears.
 */
export const allowWithholdingRun = (host: HTMLElement) =>
  adoptRules(host, `:host([${RUN_WITHHELD}]) .btn-submit { display: none; }`);

export const withholdRun = (host: HTMLElement, withheld: boolean) => {
  host.toggleAttribute(RUN_WITHHELD, withheld);
};
