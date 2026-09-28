/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useEffect, useEffectEvent } from "react";
import { useLocation } from "react-router";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { useBreadcrumbTrail } from "@/shared/ui/breadcrumb/breadcrumb-context";

/** The last page a member visited in one navigation section, with what it was called. */
export type SectionVisit = {
  href: string;
  /** The page's own name: the last breadcrumb level. */
  title?: string;
  /** The levels above it, root excluded ("Predict › v1" → ["Predict"]). */
  trail?: string[];
  /** The page's one-line description ("sad · v1"), when it has one. */
  description?: string;
  at: string;
};

/**
 * Where each member last was in each navigation section ("/predict/7",
 * "/models?sort=name"), so returning to a section, or signing in again on this
 * device, resumes it. Kept per member and organization: another person or
 * organization's pages are not theirs to resume.
 */
const sectionVisitsAtom = atomWithStorage<Record<string, SectionVisit>>(
  "ui/section-visits",
  {},
  createJSONStorage(() => localStorage),
  { getOnInit: true },
);

const isVisit = (value: unknown): value is SectionVisit =>
  typeof value === "object" && value !== null && typeof (value as SectionVisit).href === "string";

/** The current member's remembered visit per section root, in the current organization. */
export function useSectionMemory() {
  const [visits, setVisits] = useAtom(sectionVisitsAtom);
  const userId = useUser().data?.id;
  const organizationId = useWorkspaceContext().data?.currentOrganization.id;
  const scope = userId && organizationId !== undefined ? `${userId}:${organizationId}:` : null;

  const recall = (root: string) => {
    const visit = scope ? visits[`${scope}${root}`] : undefined;
    return isVisit(visit) ? visit : undefined;
  };

  return {
    recall,
    remember: (root: string, visit: SectionVisit) => {
      if (!scope) return;
      const key = `${scope}${root}`;
      setVisits((current) => {
        const previous = current[key];
        const same =
          isVisit(previous) &&
          previous.href === visit.href &&
          previous.title === visit.title &&
          previous.description === visit.description &&
          previous.trail?.join("›") === visit.trail?.join("›");
        // Revisiting the same page only refreshes the time when it is stale, so
        // re-renders don't rewrite storage.
        if (same && Date.parse(visit.at) - Date.parse(previous.at) < 60_000) return current;
        return { ...current, [key]: visit };
      });
    },
    /** Forgets one section: its navigation entry leads to the section start again. */
    forget: (root: string) => {
      if (!scope) return;
      setVisits((current) => {
        const next = { ...current };
        delete next[`${scope}${root}`];
        return next;
      });
    },
    /** Forgets every section of this member in this organization. */
    forgetAll: () => {
      if (!scope) return;
      setVisits((current) =>
        Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(scope))),
      );
    },
  };
}

const text = (label: unknown) => (typeof label === "string" ? label : undefined);

/**
 * Records the current page under the section that owns it, named by the
 * breadcrumb trail the page publishes. Render inside the breadcrumb provider.
 */
export function useRecordSectionLocation(activeRoot: string | undefined) {
  const location = useLocation();
  const published = useBreadcrumbTrail();
  const { remember } = useSectionMemory();
  const href = `${location.pathname}${location.search}`;
  // The first level is the organization root; the page's own name is the last.
  const levels = (published?.items ?? []).slice(1).map((item) => text(item.label));
  const title = levels.at(-1);
  const trail = levels.slice(0, -1).filter((label): label is string => Boolean(label));
  const description = published?.description;
  const signature = `${title ?? ""}|${trail.join("›")}|${description ?? ""}`;

  const record = useEffectEvent(() => {
    if (activeRoot) {
      remember(activeRoot, { href, title, trail, description, at: new Date().toISOString() });
    }
  });
  useEffect(() => record(), [activeRoot, href, signature]);
}
