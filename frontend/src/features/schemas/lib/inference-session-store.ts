/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom, useAtomValue } from "jotai";
import { useEffect } from "react";
import type { JsonRecord } from "@/features/schemas/api/schema-types";
import type { CreatePredictionRunRequest } from "@/features/schemas/api/prediction-types";

/**
 * One execution of a bookmark's form. It stays local until saved; saving
 * persists it as an inference pinned to the snapshot that ran.
 */
export type SessionEntry = {
  key: string;
  /** The snapshot the run executed; saving is refused if the bookmark moved since. */
  schemaVersionId: string;
  name: string;
  state: "running" | "ready" | "saving" | "saved";
  inputData: JsonRecord;
  results: CreatePredictionRunRequest["results"];
  /** Reports still resolving; the entry cannot be saved until they finish. */
  reportsPending: boolean;
  createdAt: string;
  savedRunId?: string;
};

/**
 * Every bookmark's session, by bookmark id. Held in memory for the whole app,
 * not by the page, so a session survives switching sections and coming back;
 * a reload or closed tab still ends it.
 */
export const inferenceSessionsAtom = atom<Record<string, SessionEntry[]>>({});

const unsavedCountAtom = atom(
  (get) =>
    Object.values(get(inferenceSessionsAtom))
      .flat()
      .filter((entry) => entry.state !== "saved").length,
);

/** Lets the browser warn before a reload or closed tab loses unsaved inferences. */
export function useWarnOnUnsavedInferences() {
  const unsaved = useAtomValue(unsavedCountAtom);

  useEffect(() => {
    if (unsaved === 0) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);
}
