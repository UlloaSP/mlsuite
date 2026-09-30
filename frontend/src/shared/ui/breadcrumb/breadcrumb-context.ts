/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

/** Who a page belongs to, which decides the first crumb. */
export type BreadcrumbScope = "organization" | "account" | "platform";

export type BreadcrumbTrailItem = { label: ReactNode; to?: string };

export type BreadcrumbRoot = {
  label: string;
  to: string;
  /** Dropdown content (a Radix DropdownMenu.Content) opened from the root crumb. */
  menu?: ReactNode;
  menuLabel?: string;
};

type Roots = Partial<Record<BreadcrumbScope, BreadcrumbRoot>>;

/**
 * What the page on screen publishes: its full trail (root first), that root's
 * details, and its one-line description when it is plain text.
 */
export type PublishedTrail = {
  items: BreadcrumbTrailItem[];
  root?: BreadcrumbRoot;
  description?: string;
};

export const BreadcrumbRootsContext = createContext<Roots>({});
export const BreadcrumbTrailContext = createContext<PublishedTrail | null>(null);
export const BreadcrumbPublishContext = createContext<(trail: PublishedTrail | null) => void>(
  () => undefined,
);

/** The page's full trail (root first) and, while mounted, publish it for the shell's location views. */
export function usePageTrail(
  items: BreadcrumbTrailItem[],
  scope: BreadcrumbScope,
  description?: string,
) {
  const root = useContext(BreadcrumbRootsContext)[scope];
  const publish = useContext(BreadcrumbPublishContext);
  // A page that is the root itself (the workspace home, titled with the
  // organization's name) is just the root, not "Acme › Acme".
  const isRootPage = items.length === 1 && items[0].label === root?.label;
  const trail: BreadcrumbTrailItem[] = root
    ? [{ label: root.label, to: root.to }, ...(isRootPage ? [] : items)]
    : items;
  // Labels are ReactNodes; the joined text/paths are a stable enough identity.
  const signature = `${trail.map((item) => `${String(item.label)}>${item.to ?? ""}`).join("|")}#${description ?? ""}`;

  const latest = useRef<PublishedTrail>({ items: trail, root, description });
  useEffect(() => {
    latest.current = { items: trail, root, description };
  });
  useEffect(() => {
    publish(latest.current);
    return () => publish(null);
  }, [publish, signature]);

  return { root, trail };
}

/** The trail of the page on screen, for the location views the shell renders (bottom bar, tree). */
export const useBreadcrumbTrail = () => useContext(BreadcrumbTrailContext);
