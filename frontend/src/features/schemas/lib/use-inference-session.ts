/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSelector } from "@tanstack/react-store";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/shared/ui/toast";
import { useUser } from "@/capabilities/workspace-context/session";
import {
  useCreatePredictionRunForBookmarkMutation,
  useCreatePredictionRunsForBookmarkMutation,
} from "@/features/schemas/api/schema-prediction-mutations";
import type { JsonRecord } from "@/features/schemas/api/schema-types";
import { inferenceSessionsAtom, type SessionEntry } from "./inference-session-store";
import { createRunName, uniqueRunName } from "./run-name";
import type {
  CreatePredictionRunRequest,
  PredictionRunDto,
  WorkspacePredictionDto,
} from "@/shared/api/openapi.gen";

export type { SessionEntry } from "./inference-session-store";

type Results = WorkspacePredictionDto[];

const toResults = (raw: JsonRecord): Results =>
  Array.isArray(raw.results) ? (raw.results as Results) : [];

export const sessionEntryStatus = (entry: SessionEntry): PredictionRunDto["status"] => {
  const succeeded = entry.results.filter((result) => result.status === "SUCCESS").length;
  if (succeeded === entry.results.length) return "SUCCESS";
  return succeeded === 0 ? "FAILED" : "PARTIAL_SUCCESS";
};

export const canSaveSessionEntry = (entry: SessionEntry) =>
  entry.state === "ready" && !entry.reportsPending && entry.name.trim().length > 0;

/** A finished bulk row: its name, the values it was run with, and each model's sealed result. */

const runRequest = (entry: SessionEntry): CreatePredictionRunRequest => ({
  schemaVersionId: entry.schemaVersionId,
  name: entry.name.trim(),
  // The inputs are the ones the results' seals vouch for; the server keeps those, not values sent beside them.
  results: entry.results.map(({ attestation }) => ({ attestation })),
});

const NO_ENTRIES: SessionEntry[] = [];

/**
 * The bookmark's session of runs: newest first, each saved or discarded. The
 * entries live in the app-wide store, so leaving the page and coming back keeps them.
 */
export function useInferenceSession(
  bookmarkId: string,
  schemaVersionId: number | undefined,
  /** Names each new run, with the time it ran. */
  bookmarkName?: string,
) {
  // Keyed by member too: another member signing in on this page never sees these.
  const sessionKey = `${useUser().data?.id ?? "anonymous"}:${bookmarkId}`;
  const entries = useSelector(inferenceSessionsAtom)[sessionKey] ?? NO_ENTRIES;
  const setEntries = useCallback(
    (change: (current: SessionEntry[]) => SessionEntry[]) =>
      inferenceSessionsAtom.set((all) => {
        const next = change(all[sessionKey] ?? NO_ENTRIES);
        if (next.length > 0) return { ...all, [sessionKey]: next };
        const rest = { ...all };
        delete rest[sessionKey];
        return rest;
      }),
    [sessionKey],
  );
  // A run still going when the page closes dies with its form; drop it.
  useEffect(
    () => () => setEntries((current) => current.filter((entry) => entry.state !== "running")),
    [setEntries],
  );
  const createRun = useCreatePredictionRunForBookmarkMutation(bookmarkId);
  const createRuns = useCreatePredictionRunsForBookmarkMutation(bookmarkId);
  // The entry the mounted form is producing; results stream into it.
  const liveKeyRef = useRef<string | null>(null);
  const [liveKey, setLiveKeyState] = useState<string | null>(null);
  const setLiveKey = useCallback((key: string | null) => {
    liveKeyRef.current = key;
    setLiveKeyState(key);
  }, []);
  const savingRef = useRef(new Set<string>());

  const update = useCallback(
    (key: string, change: Partial<SessionEntry>) =>
      setEntries((current) =>
        current.map((entry) => (entry.key === key ? { ...entry, ...change } : entry)),
      ),
    [setEntries],
  );

  const onRunningChange = useCallback(
    (running: boolean) => {
      if (running) {
        // The form only mounts once its snapshot has loaded.
        if (schemaVersionId === undefined) return;
        const key = crypto.randomUUID();
        setLiveKey(key);
        setEntries((current) => [
          {
            key,
            schemaVersionId,
            name: uniqueRunName(
              createRunName(bookmarkName),
              current.map((entry) => entry.name),
            ),
            state: "running",
            inputData: {},
            results: [],
            reportsPending: false,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ]);
        return;
      }
      // A run that stopped without a result (abort, error) leaves nothing to keep. On
      // success MLForm reports "stopped" just before the result, so check after it lands.
      const key = liveKeyRef.current;
      queueMicrotask(() =>
        setEntries((current) =>
          current.filter((entry) => entry.key !== key || entry.state !== "running"),
        ),
      );
    },
    [bookmarkName, schemaVersionId, setEntries, setLiveKey],
  );

  const onResult = useCallback(
    (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => {
      const key = liveKeyRef.current;
      if (!key) return;
      setEntries((current) =>
        current.map((entry) =>
          entry.key === key && (entry.state === "running" || entry.state === "ready")
            ? { ...entry, state: "ready", inputData, results: toResults(raw), reportsPending }
            : entry,
        ),
      );
    },
    [setEntries],
  );

  /** The form remounted (e.g. prefilled from a saved run); earlier entries stop being live. */
  const detachForm = useCallback(() => setLiveKey(null), [setLiveKey]);

  const save = useCallback(
    (entry: SessionEntry): Promise<boolean> => {
      if (!canSaveSessionEntry(entry) || savingRef.current.has(entry.key)) {
        return Promise.resolve(false);
      }
      savingRef.current.add(entry.key);
      update(entry.key, { state: "saving" });
      return createRun
        .mutateAsync(runRequest(entry))
        .then(
          (run) => {
            update(entry.key, { state: "saved", savedRunId: run.id });
            return true;
          },
          (error: unknown) => {
            update(entry.key, { state: "ready" });
            toast.error(`Could not save ${entry.name}`, {
              description: error instanceof Error ? error.message : String(error),
            });
            return false;
          },
        )
        .finally(() => savingRef.current.delete(entry.key));
    },
    [createRun, update],
  );

  /** Saves every finished run, oldest first, so history keeps the order the runs happened in. */
  const saveAll = useCallback(async () => {
    const pending = [...entries]
      .reverse()
      .filter((entry) => canSaveSessionEntry(entry) && !savingRef.current.has(entry.key));
    if (pending.length === 0) return;
    const keys = new Set(pending.map((entry) => entry.key));
    keys.forEach((key) => savingRef.current.add(key));
    setEntries((current) =>
      current.map((entry) => (keys.has(entry.key) ? { ...entry, state: "saving" } : entry)),
    );
    const saved = new Set<string>();
    const failure = await createRuns
      .mutateAsync({
        runs: pending.map(runRequest),
        onSaved: (from, runIds) => {
          const ids = new Map(runIds.map((id, index) => [pending[from + index]!.key, id]));
          ids.forEach((_id, key) => saved.add(key));
          setEntries((current) =>
            current.map((entry) =>
              ids.has(entry.key)
                ? { ...entry, state: "saved", savedRunId: ids.get(entry.key) }
                : entry,
            ),
          );
        },
      })
      .then(
        () => null,
        (error: unknown) => (error instanceof Error ? error.message : "The server did not answer."),
      );
    // Runs not saved, by failure or by a batch that never answered, can be saved again.
    setEntries((current) =>
      current.map((entry) =>
        keys.has(entry.key) && entry.state === "saving" ? { ...entry, state: "ready" } : entry,
      ),
    );
    keys.forEach((key) => savingRef.current.delete(key));
    if (failure !== null) {
      const left = pending.length - saved.size;
      toast.error(`Could not save ${left} inference${left === 1 ? "" : "s"}`, {
        description: failure,
      });
    }
    if (saved.size > 0)
      toast.success(saved.size === 1 ? "Inference saved" : `${saved.size} inferences saved`);
  }, [entries, createRuns, setEntries]);

  const rename = useCallback((key: string, name: string) => update(key, { name }), [update]);

  const remove = useCallback(
    (key: string) => {
      if (liveKeyRef.current === key) setLiveKey(null);
      setEntries((current) => current.filter((entry) => entry.key !== key));
    },
    [setEntries, setLiveKey],
  );

  /** Empties the session; saved entries stay in the bookmark's history. */
  const discardAll = useCallback(() => {
    setLiveKey(null);
    setEntries((current) => current.filter((entry) => entry.state === "saving"));
  }, [setEntries, setLiveKey]);

  return {
    entries,
    liveKey,
    unsavedCount: entries.filter((entry) => entry.state !== "saved").length,
    onRunningChange,
    onResult,
    detachForm,
    save,
    saveAll,
    rename,
    remove,
    discardAll,
  };
}
