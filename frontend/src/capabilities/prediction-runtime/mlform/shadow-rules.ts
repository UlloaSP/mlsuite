/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * Adds rules to a mounted MLForm element's shadow root, for what the kit exposes no option
 * or part for. Skipped where stylesheets can't be built (jsdom).
 */
export const adoptShadowRules = (host: HTMLElement, rules: string) => {
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
