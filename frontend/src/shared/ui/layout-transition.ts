/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { flushSync } from "react-dom";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

// Names are applied only for this transition: permanent names would pull the
// sidebar out of the theme reveal and the content out of its route fade.
const PARTS = [
  { selector: "[data-app-sidebar]", name: "app-layout-sidebar" },
  { selector: ".app-content-transition", name: "app-layout-main" },
] as const;

/** Applies a shell layout change (sidebar side or style) as a morph instead of a jump. */
export function animateLayoutChange(update: () => void) {
  const transitionDocument = document as ViewTransitionDocument;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!transitionDocument.startViewTransition || reduceMotion) {
    update();
    document.scrollingElement?.scrollTo(0, 0);
    return;
  }

  const named = PARTS.flatMap(({ selector, name }) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return [];
    const previous = element.style.viewTransitionName;
    element.style.viewTransitionName = name;
    return [{ element, previous }];
  });
  const restore = () => {
    named.forEach(({ element, previous }) => {
      element.style.viewTransitionName = previous;
    });
    // Reflowing the shell can nudge the document; it never scrolls on purpose.
    document.scrollingElement?.scrollTo(0, 0);
  };

  // The new snapshot is taken when the callback returns, so React must commit synchronously.
  const transition = transitionDocument.startViewTransition(() => flushSync(update));
  void transition.finished.finally(restore);
}
