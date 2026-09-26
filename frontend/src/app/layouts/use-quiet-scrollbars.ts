/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect } from "react";

const VISIBLE = "data-scrollbar-visible";
const HIDE_AFTER_SCROLL_MS = 900;

/** Whether the pointer sits over the element's own vertical scrollbar. */
const overScrollbar = (element: Element, clientX: number) => {
  const gutter =
    (element as HTMLElement).offsetWidth - element.clientWidth - element.clientLeft * 2;
  if (gutter <= 0) return false;
  const rect = element.getBoundingClientRect();
  return clientX >= rect.left + element.clientLeft + element.clientWidth;
};

/**
 * With floating navigation, content scrollbars stay invisible (base.css) and are
 * revealed only while the pointer is over one or the element is scrolling, so no
 * permanent line marks the edge next to the panel.
 */
export function useQuietScrollbars(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let hovered: Element | null = null;
    const scrolling = new Map<Element, number>();
    const inContent = (target: EventTarget | null): target is Element =>
      target instanceof Element && target.closest(".app-content-transition") !== null;
    const refresh = (element: Element) =>
      element.toggleAttribute(VISIBLE, element === hovered || scrolling.has(element));

    const onPointerMove = (event: PointerEvent) => {
      const target =
        inContent(event.target) && overScrollbar(event.target, event.clientX) ? event.target : null;
      if (target === hovered) return;
      const previous = hovered;
      hovered = target;
      if (previous) refresh(previous);
      if (target) refresh(target);
    };
    const onScroll = (event: Event) => {
      if (!inContent(event.target)) return;
      const element = event.target;
      window.clearTimeout(scrolling.get(element));
      scrolling.set(
        element,
        window.setTimeout(() => {
          scrolling.delete(element);
          refresh(element);
        }, HIDE_AFTER_SCROLL_MS),
      );
      refresh(element);
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("scroll", onScroll, { capture: true });
      scrolling.forEach((timer) => window.clearTimeout(timer));
      document
        .querySelectorAll(`[${VISIBLE}]`)
        .forEach((element) => element.removeAttribute(VISIBLE));
    };
  }, [enabled]);
}
