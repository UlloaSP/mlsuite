/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  mountPublicRunForm,
  type MountedPublicRunForm,
} from "@/capabilities/prediction-runtime/mlform/public-run-mount";
import { applyPredictionInputsToSchema } from "@/capabilities/prediction-runtime/mlform/schema-inputs";
import { schemaNeedsPluginCatalog } from "@/capabilities/prediction-runtime/mlform/schema-plugin-requirement";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { runPublicBookmark } from "@/features/explore/api/public-bookmark-api";
import { PublicBookmarkExampleSelect } from "@/features/explore/components/PublicBookmarkExampleSelect";
import { publicRunFailure, type PublicRunFailure } from "@/features/explore/lib/public-run-failure";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { cx } from "@/shared/ui/cx";
import type { PublicBookmarkDto, PublicBookmarkExampleDto } from "@/shared/api/openapi.gen";

type Props = Pick<PublicBookmarkDto, "publicId" | "version" | "formSchema"> & {
  examples?: readonly PublicBookmarkExampleDto[];
};

const hasFields = (schema: PublicBookmarkDto["formSchema"]) =>
  Array.isArray(schema.fields) && schema.fields.length > 0;

/**
 * The form of a public bookmark, to fill and run. A run is one request that the server routes
 * to the bookmark's models; its result lives in this form until the next run or until the page
 * is left. Plugin fields and reports are code from an organization's private catalog, so a form
 * that uses them says so instead of loading that code for a visitor.
 *
 * A form that can be shown offers the bookmark's curated examples above it. Loading one starts
 * the form again with the example's inputs as the fields' starting values, as a saved run's are
 * in the workspace form, so the visitor can edit them and run. The loaded example is kept as it
 * was chosen: a later refetch of the list never resets what the visitor is editing.
 */
export function PublicBookmarkForm({ publicId, version, formSchema, examples = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef<MountedPublicRunForm | null>(null);
  const [theme] = useAtom(themeWithHtmlAtom);
  const [initialTheme] = useState(theme);
  const [mountError, setMountError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState<PublicRunFailure | null>(null);
  const empty = !hasFields(formSchema);
  const needsPlugins = schemaNeedsPluginCatalog(formSchema);
  const mountable = !empty && !needsPlugins;
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
        theme: initialTheme,
        run: async (values, signal) => {
          const result = await runPublicBookmark(publicId, { version, values }, signal);
          return result.reports.map((report) => ({
            key: report.key,
            payload: isRecord(report.payload) ? report.payload : {},
          }));
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
  }, [initialTheme, mountable, publicId, schema, version]);

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
  if (needsPlugins) {
    return (
      <AppEmptyState
        compact
        title="This form cannot be shown here"
        description="It uses plugin fields or reports from its organization's private catalog, which public pages cannot load."
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {examples.length > 0 ? (
        <PublicBookmarkExampleSelect
          examples={examples}
          value={example?.id}
          onChange={(id) => setExample(examples.find((item) => item.id === id))}
        />
      ) : null}
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg-secondary">
          Runs from this page are not saved: a result stays here until you run again or leave.
        </p>
        {failure ? (
          <AppInlineAlert>
            <strong className="font-semibold">{failure.title}.</strong> {failure.detail}
          </AppInlineAlert>
        ) : null}
        {mountError ? (
          <AppEmptyState
            compact
            title="This form could not be displayed"
            description={mountError}
          />
        ) : null}
        <div
          ref={containerRef}
          aria-busy={running}
          className={cx("min-h-0 w-full", running && "cursor-progress", mountError && "hidden")}
        />
      </div>
    </div>
  );
}
