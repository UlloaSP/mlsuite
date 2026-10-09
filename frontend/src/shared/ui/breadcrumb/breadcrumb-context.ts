/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

export type BreadcrumbTrailItem = { label: ReactNode; to?: string };

export const BreadcrumbTrailContext = createContext<BreadcrumbTrailItem[] | null>(null);
export const BreadcrumbPublishContext = createContext<
  (trail: BreadcrumbTrailItem[] | null) => void
>(() => undefined);

/**
 * A trail exists only below a section: the levels from the section's own page down to this
 * one. A page that is itself a navigation entry has one level, which is no trail at all.
 */
export const isTrail = (
  items: BreadcrumbTrailItem[] | null | undefined,
): items is BreadcrumbTrailItem[] => items != null && items.length > 1;

/** While mounted, publish the page's trail for the shell's location views. */
export function usePageTrail(items: BreadcrumbTrailItem[]) {
  const publish = useContext(BreadcrumbPublishContext);
  // Labels are ReactNodes; the joined text/paths are a stable enough identity.
  const signature = items.map((item) => `${String(item.label)}>${item.to ?? ""}`).join("|");

  const latest = useRef(items);
  useEffect(() => {
    latest.current = items;
  });
  useEffect(() => {
    publish(latest.current);
    return () => publish(null);
  }, [publish, signature]);
}

/** The trail of the page on screen, for the location views the shell renders (bottom bar, rail). */
export const useBreadcrumbTrail = () => useContext(BreadcrumbTrailContext);
