/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { mergeSchemaRunInputs } from "@/capabilities/prediction-runtime/data/input-display";
import { useUser } from "@/capabilities/workspace-context/session";
import { useCreatePredictionRunForBookmarkMutation } from "@/features/schemas/api/schema-prediction-mutations";
import type { JsonRecord } from "@/features/schemas/api/schema-types";
import { inferenceSessionsAtom, type SessionEntry } from "./inference-session-store";
import type { CreatePredictionRunRequest, PredictionRunDto } from "@/shared/api/openapi.gen";

export type { SessionEntry } from "./inference-session-store";

type Results = CreatePredictionRunRequest["results"];

const createRunName = () => `run-${new Date().toISOString()}`;

const toResults = (raw: JsonRecord): Results =>
  Array.isArray(raw.results) ? (raw.results as Results) : [];

export const sessionEntryStatus = (entry: SessionEntry): PredictionRunDto["status"] => {
  const succeeded = entry.results.filter((result) => result.status === "SUCCESS").length;
  if (succeeded === entry.results.length) return "SUCCESS";
  return succeeded === 0 ? "FAILED" : "PARTIAL_SUCCESS";
};

export const canSaveSessionEntry = (entry: SessionEntry) =>
  entry.state === "ready" && !entry.reportsPending && entry.name.trim().length > 0;

const NO_ENTRIES: SessionEntry[] = [];

/**
 * The bookmark's session of runs: newest first, each saved or discarded. The
 * entries live in the app-wide store, so leaving the page and coming back keeps them.
 */
export function useInferenceSession(bookmarkId: string, schemaVersionId: number | undefined) {
  // Keyed by member too: another member signing in on this page never sees these.
  const sessionKey = `${useUser().data?.id ?? "anonymous"}:${bookmarkId}`;
  const entries = useAtomValue(inferenceSessionsAtom)[sessionKey] ?? NO_ENTRIES;
  const setSessions = useSetAtom(inferenceSessionsAtom);
  const setEntries = useCallback(
    (change: (current: SessionEntry[]) => SessionEntry[]) =>
      setSessions((all) => {
        const next = change(all[sessionKey] ?? NO_ENTRIES);
        if (next.length > 0) return { ...all, [sessionKey]: next };
        const rest = { ...all };
        delete rest[sessionKey];
        return rest;
      }),
    [sessionKey, setSessions],
  );
  // A run still going when the page closes dies with its form; drop it.
  useEffect(
    () => () => setEntries((current) => current.filter((entry) => entry.state !== "running")),
    [setEntries],
  );
  const createRun = useCreatePredictionRunForBookmarkMutation(bookmarkId);
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
            name: createRunName(),
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
    [schemaVersionId, setLiveKey],
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
    [],
  );

  /** The form remounted (e.g. prefilled from a saved run); earlier entries stop being live. */
  const detachForm = useCallback(() => setLiveKey(null), [setLiveKey]);

  const save = useCallback(
    async (entry: SessionEntry) => {
      if (!canSaveSessionEntry(entry) || savingRef.current.has(entry.key)) return false;
      savingRef.current.add(entry.key);
      update(entry.key, { state: "saving" });
      try {
        const run = await createRun.mutateAsync({
          schemaVersionId: entry.schemaVersionId,
          name: entry.name.trim(),
          inputData: mergeSchemaRunInputs(entry.inputData, entry.results),
          results: entry.results,
        });
        update(entry.key, { state: "saved", savedRunId: run.id });
        return true;
      } catch (error) {
        update(entry.key, { state: "ready" });
        toast.error(`Could not save ${entry.name}`, {
          description: error instanceof Error ? error.message : String(error),
        });
        return false;
      } finally {
        savingRef.current.delete(entry.key);
      }
    },
    [createRun, update],
  );

  const saveAll = useCallback(async () => {
    let saved = 0;
    // Sequential, oldest first, so history keeps the order the runs happened in.
    for (const entry of [...entries].reverse()) {
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- Saves one at a time, in the order the runs happened.
      if (canSaveSessionEntry(entry) && (await save(entry))) saved += 1;
    }
    if (saved > 0) toast.success(saved === 1 ? "Inference saved" : `${saved} inferences saved`);
  }, [entries, save]);

  const rename = useCallback((key: string, name: string) => update(key, { name }), [update]);

  const remove = useCallback(
    (key: string) => {
      if (liveKeyRef.current === key) setLiveKey(null);
      setEntries((current) => current.filter((entry) => entry.key !== key));
    },
    [setLiveKey],
  );

  /** Empties the session; saved entries stay in the bookmark's history. */
  const discardAll = useCallback(() => {
    setLiveKey(null);
    setEntries((current) => current.filter((entry) => entry.state === "saving"));
  }, [setLiveKey]);

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
