/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";

const MAX_RESTORE_FRAMES = 60;

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
 * (`RESTORE_SCROLL_STATE`), which restores the last position seen at that URL. Restoring waits (up to ~1s) for content that
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
      if (!name) return;
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
    let frames = 0;
    let frame = 0;
    const restore = () => {
      let waiting = false;
      for (const [name, top] of Object.entries(saved)) {
        const element = document.querySelector<HTMLElement>(`[data-scroll-memory="${name}"]`);
        if (!element || element.scrollHeight - element.clientHeight < top) {
          waiting = true;
          continue;
        }
        element.scrollTop = top;
      }
      if (waiting && frames++ < MAX_RESTORE_FRAMES) frame = requestAnimationFrame(restore);
    };
    frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [location.key, location.state, navigationType, url]);
}
