/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { schemaNeedsPluginCatalog } from "@/capabilities/prediction-runtime/mlform/schema-plugin-requirement";
import {
  MLFORM_INPUTS_ONLY_CONTAINER_CLASS,
  mountSchemaInputs,
  type MountedSchemaInputs,
} from "@/capabilities/prediction-runtime/mlform/schema-inputs-mount";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { cx } from "@/shared/ui/cx";
import type { PublicBookmarkDto } from "@/shared/api/openapi.gen";

const hasFields = (schema: PublicBookmarkDto["formSchema"]) =>
  Array.isArray(schema.fields) && schema.fields.length > 0;

/**
 * The inputs of a public bookmark, fillable but with nothing to run. Plugin fields are
 * compiled from an organization's private catalog, so a form that uses them says so
 * instead of borrowing the visitor's own catalog.
 */
export function PublicBookmarkForm({
  formSchema,
}: {
  formSchema: PublicBookmarkDto["formSchema"];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef<MountedSchemaInputs | null>(null);
  const [theme] = useAtom(themeWithHtmlAtom);
  const [initialTheme] = useState(theme);
  const [mountError, setMountError] = useState<string | null>(null);
  const empty = !hasFields(formSchema);
  const needsPlugins = schemaNeedsPluginCatalog(formSchema);
  const mountable = !empty && !needsPlugins;

  useEffect(() => {
    if (!mountable || !containerRef.current) return;
    setMountError(null);
    try {
      const mounted = mountSchemaInputs({
        container: containerRef.current,
        schema: formSchema,
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
  }, [formSchema, initialTheme, mountable]);

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
