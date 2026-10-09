/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";

// Content that is only laying out gets a moment; a catalog fetching its pages gets longer.
const MAX_SETTLE_MS = 1_000;
const MAX_LOADING_MS = 30_000;

/**
 * Navigation state for returning to a place rather than visiting it anew (a
 * navigation entry resuming its section): restores that URL's last scroll.
 */
export const RESTORE_SCROLL_STATE = { restoreScroll: true } as const;

const wantsRestore = (state: unknown) =>
  typeof state === "object" && state !== null && "restoreScroll" in state;

/**
 * Pages scroll inside their own containers, so the router's window scroll
 * restoration never sees them. Containers marked `data-scroll-memory="<name>"`
 * have their position remembered per history entry and restored on back/forward;
 * new (PUSH) navigations start at the top, unless they return to a section
 * (`RESTORE_SCROLL_STATE`), which restores the last position seen at that URL. Restoring waits for paged content that
 * is still loading to become tall enough.
 */
export function useScrollMemory() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, Record<string, number>>());
  const byUrl = useRef(new Map<string, Record<string, number>>());
  const url = `${location.pathname}${location.search}`;

  useEffect(() => {
    const remember = (event: Event) => {
      const element = event.target;
      if (!(element instanceof HTMLElement)) return;
      const name = element.dataset.scrollMemory;
      if (!name || element.dataset.catalogRestoreTop) return;
      const entry = positions.current.get(location.key) ?? {};
      entry[name] = element.scrollTop;
      positions.current.set(location.key, entry);
      byUrl.current.set(url, { ...entry });
    };
    document.addEventListener("scroll", remember, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", remember, { capture: true });
  }, [location.key, url]);

  useEffect(() => {
    // A new visit starts at the top even when the next page reuses the same
    // container; REPLACE (tabs and filters kept in the URL) leaves scroll alone.
    const resuming = navigationType === "PUSH" && wantsRestore(location.state);
    if (navigationType === "PUSH" && !resuming) {
      document.querySelectorAll<HTMLElement>("[data-scroll-memory]").forEach((element) => {
        element.scrollTop = 0;
      });
      return;
    }
    if (navigationType !== "POP" && !resuming) return;
    const saved = resuming ? byUrl.current.get(url) : positions.current.get(location.key);
    if (!saved) return;
    const pending = new Map(Object.entries(saved));
    const startedAt = performance.now();
    let frame = 0;
    const restore = () => {
      const elapsed = performance.now() - startedAt;
      for (const [name, top] of pending) {
        const element = document.querySelector<HTMLElement>(`[data-scroll-memory="${name}"]`);
        const reachable = element != null && element.scrollHeight - element.clientHeight >= top;
        // A catalog still fetching pages can grow to the offset; anything else only settles.
        const loading = element?.dataset.catalogLoading === "true";
        if (!reachable && elapsed < (loading ? MAX_LOADING_MS : MAX_SETTLE_MS)) {
          if (element && loading && element.dataset.catalogRestoreTop !== String(top)) {
            element.dataset.catalogRestoreTop = String(top);
            element.dispatchEvent(new Event("catalog-restore"));
          }
          continue;
        }
        if (element) {
          element.scrollTop = top;
          delete element.dataset.catalogRestoreTop;
        }
        pending.delete(name);
      }
      if (pending.size > 0) frame = requestAnimationFrame(restore);
    };
    const cancel = () => {
      cancelAnimationFrame(frame);
      pending.clear();
      document
        .querySelectorAll<HTMLElement>("[data-catalog-restore-top]")
        .forEach((element) => delete element.dataset.catalogRestoreTop);
    };
    // Any input from the user takes over; the restore never fights it.
    const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    inputs.forEach((input) =>
      document.addEventListener(input, cancel, { capture: true, passive: true, once: true }),
    );
    frame = requestAnimationFrame(restore);
    return () => {
      cancel();
      inputs.forEach((input) => document.removeEventListener(input, cancel, { capture: true }));
    };
  }, [location.key, location.state, navigationType, url]);
}
