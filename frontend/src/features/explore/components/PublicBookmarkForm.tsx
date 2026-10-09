/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  mountPublicRunForm,
  type MountedPublicRunForm,
} from "@/capabilities/prediction-runtime/mlform/public-run-mount";
import { applyPredictionInputsToSchema } from "@/capabilities/prediction-runtime/mlform/schema-inputs";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { MLFORM_SPLIT_CONTAINER_CLASS } from "@/capabilities/prediction-runtime/mlform/split-layout";
import { useAccountEntry } from "@/capabilities/workspace-context/account-entry";
import {
  publicRunQuotaQueryOptions,
  runPublicBookmark,
} from "@/features/explore/api/public-bookmark-api";
import { PublicBookmarkExampleSelect } from "@/features/explore/components/PublicBookmarkExampleSelect";
import { PublicRunQuota } from "@/features/explore/components/PublicRunQuota";
import { publicRunFailure, type PublicRunFailure } from "@/features/explore/lib/public-run-failure";
import { publicRunLimitQuota } from "@/features/explore/lib/public-run-limit";
import { usePublicPluginCatalog } from "@/features/explore/lib/use-public-plugin-catalog";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { cx } from "@/shared/ui/cx";
import type {
  PublicBookmarkDto,
  PublicBookmarkExampleDto,
  PublicRunDto,
} from "@/shared/api/openapi.gen";

type Props = Pick<PublicBookmarkDto, "publicId" | "version" | "formSchema"> & {
  /** Told of each run the server kept, as it answered. */
  onRun: (run: PublicRunDto) => void;
  /** Drawn under the form once a run was made: what became of it. */
  afterRun?: ReactNode;
};

const hasFields = (schema: PublicBookmarkDto["formSchema"]) =>
  Array.isArray(schema.fields) && schema.fields.length > 0;

/**
 * The form of a public bookmark, to fill and run: its inputs and results in two tabs, as wide
 * as the page and as tall as the page lets it be, scrolling inside. A run is one request that
 * the server routes to the bookmark's models and keeps as this browser's; its result shows in
 * the form until the next run, and stays in the page's runs. A form made with plugin fields or
 * reports loads them first: only a schema of the owning organization may use a plugin, but
 * whoever can open the form runs it.
 *
 * A form that can be shown offers the bookmark's curated examples above it. Loading one starts
 * the form again with the example's inputs as the fields' starting values, as a saved run's are
 * in the workspace form, so the visitor can edit them and run. The loaded example is kept as it
 * was chosen: a later refetch of the list never resets what the visitor is editing.
 *
 * The server limits how often one caller runs one bookmark. The count it reports is shown under
 * the form, and with no run left the run action is withheld: the values and the last result stay.
 */
export function PublicBookmarkForm({ publicId, version, formSchema, onRun, afterRun }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;
  const mountedRef = useRef<MountedPublicRunForm | null>(null);
  const [theme] = useAtom(themeWithHtmlAtom);
  const [initialTheme] = useState(theme);
  const [mountError, setMountError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState<PublicRunFailure | null>(null);
  const empty = !hasFields(formSchema);
  const catalog = usePublicPluginCatalog(publicId, formSchema);
  const { plugins } = catalog;
  const mountable = !empty && catalog.ready;
  const queryClient = useQueryClient();
  // The frame offers an account only to a visitor without a session, whom the server counts apart.
  const caller = useAccountEntry() ? "visitor" : "member";
  const quota = useQuery({
    ...publicRunQuotaQueryOptions(publicId, caller),
    enabled: mountable,
  }).data;
  const [example, setExample] = useState<PublicBookmarkExampleDto>();
  const schema = useMemo(
    () => (example ? applyPredictionInputsToSchema(formSchema, example.inputs) : formSchema),
    [example, formSchema],
  );

  useEffect(() => {
    if (!mountable || !containerRef.current) return;
    setMountError(null);
    setFailure(null);
    try {
      const mounted = mountPublicRunForm({
        container: containerRef.current,
        schema,
        plugins,
        theme: initialTheme,
        run: async (values, signal) => {
          const { queryKey } = publicRunQuotaQueryOptions(publicId, caller);
          if (queryClient.getQueryData(queryKey)?.remaining === 0) return null;
          try {
            const result = await runPublicBookmark(publicId, { version, values }, signal);
            queryClient.setQueryData(queryKey, result.quota);
            onRunRef.current(result.run);
            return result.run.reports.map((report) => ({
              key: report.key,
              payload: isRecord(report.payload) ? report.payload : {},
            }));
          } catch (error) {
            const used = publicRunLimitQuota(error);
            if (used) {
              queryClient.setQueryData(queryKey, used);
              return null;
            }
            // Some refused runs count and some do not, so the server is asked again.
            void queryClient.invalidateQueries({ queryKey });
            throw error;
          }
        },
        onRunningChange: (next) => {
          setRunning(next);
          if (next) setFailure(null);
        },
        onRunError: (error) => setFailure(publicRunFailure(error)),
      });
      mountedRef.current = mounted;
      return () => {
        mounted.unmount();
        if (mountedRef.current === mounted) mountedRef.current = null;
      };
    } catch (error) {
      setMountError(error instanceof Error ? error.message : String(error));
    }
  }, [caller, initialTheme, mountable, plugins, publicId, queryClient, schema, version]);

  // After every render, because loading an example mounts a new form that must be told too.
  useEffect(() => {
    mountedRef.current?.setRunOffered(quota?.remaining !== 0);
  });

  useEffect(() => {
    mountedRef.current?.updateTheme(theme);
  }, [theme]);

  if (empty) {
    return (
      <AppEmptyState
        compact
        title="This form has no inputs"
        description="The published snapshot does not define any fields."
      />
    );
  }
  if (catalog.failed) {
    return (
      <AppEmptyState
        compact
        title="This form could not be loaded"
        description="Some of its fields or reports did not arrive."
        action={
          <AppButton size="sm" variant="secondary" onClick={catalog.retry}>
            Retry
          </AppButton>
        }
      />
    );
  }
  if (!catalog.ready) return <AppLoadingState label="Loading form…" rows={3} />;
  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <PublicBookmarkExampleSelect publicId={publicId} value={example} onChange={setExample} />
      {failure ? (
        <AppInlineAlert>
          <strong className="font-semibold">{failure.title}.</strong> {failure.detail}
        </AppInlineAlert>
      ) : null}
      {mountError ? (
        <AppEmptyState compact title="This form could not be displayed" description={mountError} />
      ) : null}
      <div
        className={cx(
          "overflow-hidden rounded-card border border-line lg:min-h-0 lg:flex-1",
          mountError && "hidden",
        )}
      >
        <div
          ref={containerRef}
          aria-busy={running}
          className={cx("size-full", MLFORM_SPLIT_CONTAINER_CLASS, running && "cursor-progress")}
        />
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        {afterRun}
        {quota && !mountError ? <PublicRunQuota quota={quota} /> : null}
        <p className="text-sm text-fg-muted">
          Runs from this page are kept for this browser, with their results, in Your runs.
        </p>
      </div>
    </div>
  );
}
