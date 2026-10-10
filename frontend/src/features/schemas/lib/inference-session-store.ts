/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import type { JsonRecord } from "@/features/schemas/api/schema-types";
import type { CreatePredictionRunRequest } from "@/shared/api/openapi.gen";

/**
 * One execution of a bookmark's form. It stays local until saved; saving
 * persists it as an inference pinned to the snapshot that ran.
 */
export type SessionEntry = {
  key: string;
  /** The snapshot the run executed; saving is refused if the bookmark moved since. */
  schemaVersionId: number;
  name: string;
  state: "running" | "ready" | "saving" | "saved";
  inputData: JsonRecord;
  results: CreatePredictionRunRequest["results"];
  /** Reports still resolving; the entry cannot be saved until they finish. */
  reportsPending: boolean;
  createdAt: string;
  savedRunId?: number;
};

/**
 * Every member's session per bookmark, keyed "member:bookmark". Held in memory for the whole app,
 * not by the page, so a session survives switching sections and coming back;
 * a reload or closed tab still ends it.
 */
export const inferenceSessionsAtom = atom<Record<string, SessionEntry[]>>({});

/** Whose sessions the store holds; sessions never outlive a change of member. */
const sessionsOwnerAtom = atom<number | undefined>(undefined);

/**
 * Drops the previous member's sessions when a different member signs in on this
 * page (they were never visible to the new one, being keyed by member), so the
 * reload warning only counts the current member's work. The same member signing
 * in again keeps them.
 */
export function useScopeInferenceSessionsToUser(userId: number | undefined) {
  const [owner, setOwner] = useAtom(sessionsOwnerAtom);
  const setSessions = useSetAtom(inferenceSessionsAtom);

  useEffect(() => {
    if (!userId || userId === owner) return;
    if (owner !== undefined) setSessions({});
    setOwner(userId);
  }, [owner, setOwner, setSessions, userId]);
}

const unsavedCountAtom = atom(
  (get) =>
    Object.values(get(inferenceSessionsAtom))
      .flat()
      .filter((entry) => entry.state !== "saved").length,
);

/** How many runs of a member's session on a bookmark are not saved yet. */
export function useUnsavedSessionRuns(userId: number | undefined, bookmarkId: string) {
  const entries = useAtomValue(inferenceSessionsAtom)[`${userId ?? "anonymous"}:${bookmarkId}`];
  return entries?.filter((entry) => entry.state !== "saved").length ?? 0;
}

/**
 * The unsaved runs of every session, and a way to drop them all: what a member is asked about
 * before an action of their own (signing out) loads a new document and loses them.
 */
export function useUnsavedInferences() {
  const count = useAtomValue(unsavedCountAtom);
  const setSessions = useSetAtom(inferenceSessionsAtom);
  return { count, discard: () => setSessions({}) };
}

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
