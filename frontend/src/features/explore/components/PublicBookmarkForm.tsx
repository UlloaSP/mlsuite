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
 * `initialInputs` are an example's values, keyed like the form's fields. They become the fields'
 * starting values, as a saved run's do in the workspace form, so the visitor can edit them. A
 * form is mounted once: the page remounts it to load another example.
 */
export function PublicBookmarkForm({
  formSchema,
  initialInputs,
}: {
  formSchema: PublicBookmarkDto["formSchema"];
  initialInputs?: PublicBookmarkExampleDto["inputs"];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef<MountedSchemaInputs | null>(null);
  const [theme] = useAtom(themeWithHtmlAtom);
  const [initialTheme] = useState(theme);
  const [mountError, setMountError] = useState<string | null>(null);
  const empty = !hasFields(formSchema);
  const needsPlugins = schemaNeedsPluginCatalog(formSchema);
  const mountable = !empty && !needsPlugins;
  const schema = useMemo(
    () => (initialInputs ? applyPredictionInputsToSchema(formSchema, initialInputs) : formSchema),
    [formSchema, initialInputs],
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
    <>
      {mountError ? (
        <AppEmptyState compact title="This form could not be displayed" description={mountError} />
      ) : null}
      <div
        ref={containerRef}
        className={cx("min-h-0 w-full", MLFORM_INPUTS_ONLY_CONTAINER_CLASS, mountError && "hidden")}
      />
    </>
  );
}
