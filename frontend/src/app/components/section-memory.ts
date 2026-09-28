/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useEffect, useEffectEvent } from "react";
import { useLocation } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";

/**
 * Where the member last was in each navigation section ("/predict/7",
 * "/models?sort=name"), so returning to a section resumes it instead of starting
 * over. Per tab (session storage) and per organization: another organization's
 * pages would not resolve here.
 */
const sectionMemoryAtom = atomWithStorage<Record<string, string>>(
  "ui/section-memory",
  {},
  createJSONStorage(() => sessionStorage),
  { getOnInit: true },
);

const memoryKey = (organizationId: number | undefined, root: string) =>
  `${organizationId ?? "none"}:${root}`;

/** The remembered location of each section root, for the current organization. */
export function useSectionMemory() {
  const [memory, setMemory] = useAtom(sectionMemoryAtom);
  const { data: workspace } = useWorkspaceContext();
  const organizationId = workspace?.currentOrganization.id;

  return {
    recall: (root: string) => memory[memoryKey(organizationId, root)],
    remember: (root: string, href: string) => {
      const key = memoryKey(organizationId, root);
      setMemory((current) => (current[key] === href ? current : { ...current, [key]: href }));
    },
  };
}

/** Records the current location under the section that owns it. */
export function useRecordSectionLocation(activeRoot: string | undefined) {
  const location = useLocation();
  const { remember } = useSectionMemory();
  const href = `${location.pathname}${location.search}`;

  const record = useEffectEvent(() => {
    if (activeRoot) remember(activeRoot, href);
  });
  useEffect(() => record(), [activeRoot, href]);
}
