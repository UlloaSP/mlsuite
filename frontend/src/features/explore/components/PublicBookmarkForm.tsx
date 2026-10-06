/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { applyPredictionInputsToSchema } from "@/capabilities/prediction-runtime/mlform/schema-inputs";
import { schemaNeedsPluginCatalog } from "@/capabilities/prediction-runtime/mlform/schema-plugin-requirement";
import {
  MLFORM_INPUTS_ONLY_CONTAINER_CLASS,
  mountSchemaInputs,
  type MountedSchemaInputs,
} from "@/capabilities/prediction-runtime/mlform/schema-inputs-mount";
import { PublicBookmarkExampleSelect } from "@/features/explore/components/PublicBookmarkExampleSelect";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { cx } from "@/shared/ui/cx";
import type { PublicBookmarkDto, PublicBookmarkExampleDto } from "@/shared/api/openapi.gen";

const hasFields = (schema: PublicBookmarkDto["formSchema"]) =>
  Array.isArray(schema.fields) && schema.fields.length > 0;

/**
 * The inputs of a public bookmark, fillable but with nothing to run. Plugin fields are
 * compiled from an organization's private catalog, so a form that uses them says so
 * instead of borrowing the visitor's own catalog.
 *
 * A form that can be shown offers the bookmark's curated examples above it. Loading one starts
 * the form again with the example's inputs as the fields' starting values, as a saved run's are
 * in the workspace form, so the visitor can edit them. The loaded example is kept as it was
 * chosen: a later refetch of the list never resets what the visitor is editing.
 */
export function PublicBookmarkForm({
  formSchema,
  examples = [],
}: {
  formSchema: PublicBookmarkDto["formSchema"];
  examples?: readonly PublicBookmarkExampleDto[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef<MountedSchemaInputs | null>(null);
  const [theme] = useAtom(themeWithHtmlAtom);
  const [initialTheme] = useState(theme);
  const [mountError, setMountError] = useState<string | null>(null);
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
    try {
      const mounted = mountSchemaInputs({
        container: containerRef.current,
        schema,
        theme: initialTheme,
      });
      mountedRef.current = mounted;
      return () => {
        mounted.unmount();
        if (mountedRef.current === mounted) mountedRef.current = null;
      };
    } catch (error) {
      setMountError(error instanceof Error ? error.message : String(error));
    }
  }, [initialTheme, mountable, schema]);

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
        description="It uses plugin fields from its organization's private catalog, which public pages cannot load."
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
      {mountError ? (
        <AppEmptyState compact title="This form could not be displayed" description={mountError} />
      ) : null}
      <div
        ref={containerRef}
        className={cx("min-h-0 w-full", MLFORM_INPUTS_ONLY_CONTAINER_CLASS, mountError && "hidden")}
      />
    </div>
  );
}
