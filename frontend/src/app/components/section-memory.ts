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

/** The last page a member visited in one navigation section. */
type SectionVisit = { href: string };

/**
 * Where each member last was in each navigation section ("/predict/7",
 * "/models?sort=name"), so returning to a section resumes it. Kept per member and
 * organization: another person or organization's pages are not theirs to resume.
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
    remember: (root: string, href: string) => {
      if (!scope) return;
      const key = `${scope}${root}`;
      setVisits((current) => {
        const previous = current[key];
        // Re-renders of the same page don't rewrite storage.
        if (isVisit(previous) && previous.href === href) return current;
        return { ...current, [key]: { href } };
      });
    },
  };
}

/** Records the current page under the navigation section that owns it. */
export function useRecordSectionLocation(activeRoot: string | undefined) {
  const location = useLocation();
  const { remember } = useSectionMemory();
  const href = `${location.pathname}${location.search}`;

  const record = useEffectEvent(() => {
    if (activeRoot) remember(activeRoot, href);
  });
  useEffect(() => record(), [activeRoot, href]);
}
