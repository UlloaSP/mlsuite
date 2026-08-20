/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { lazy, Suspense, useCallback, useEffect, useRef } from "react";
import { themeWithHtmlAtom } from "@/shared/ui/ui-state";
import {
  getCustomFieldDefinitions,
  type CatalogFieldDefinition,
} from "@/capabilities/mlform/custom-field-catalog";
import {
  getCustomReportDefinitions,
  type CatalogReportDefinition,
} from "@/capabilities/mlform/custom-report-catalog";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { usePluginRuntimeSourcesQuery } from "@/capabilities/mlform/plugin-runtime-sources";
import { schemaNeedsPluginCatalog } from "@/capabilities/mlform/schema-plugin-requirement";
import { mlformJsonSchema, validateMlformSchema } from "@/capabilities/mlform/schema-validation";
import { buildCatalogWarning } from "@/features/schemas/lib/catalog-warning";
import {
  type EditorErrorCard,
  getCompatMarkerStartColumn,
  getMarkerMessage,
  pathToPos,
} from "@/features/schemas/lib/schema-diagnostics";
import { loadLocalMonacoEditor } from "@/capabilities/editor/load-local-monaco-editor";
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "@/features/schemas/lib/editor-atoms";
import { defineEditorThemes, setEditorTheme } from "@/capabilities/editor/configure-editor-theme";
import { editorOptions } from "@/capabilities/editor/editor-options";
import type {
  MonacoEditorInstance,
  MonacoJson,
  MonacoMarker,
  MonacoMarkerData,
  MonacoNamespace,
} from "@/features/schemas/lib/editor-body-types";

const MonacoEditor = lazy(loadLocalMonacoEditor);

export function EditorBody() {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const [schemaText, setSchemaText] = useAtom(schemaTextAtom);
  const [, setSchema] = useAtom(schemaAtom);
  const [, setSchemaErrors] = useAtom(schemaErrorsAtom);
  const [theme] = useAtom(themeWithHtmlAtom);
  const pluginSourcesQuery = usePluginRuntimeSourcesQuery(organizationId);

  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoNamespace | null>(null);
  const compatCardsRef = useRef<EditorErrorCard[]>([]);
  const validationSequenceRef = useRef(0);
  const catalogFieldDefinitionsRef = useRef<readonly CatalogFieldDefinition[]>([]);
  const catalogReportDefinitionsRef = useRef<readonly CatalogReportDefinition[]>([]);
  const catalogWarningRef = useRef<EditorErrorCard | null>(null);
  const schemaTextRef = useRef(schemaText);
  useEffect(() => {
    schemaTextRef.current = schemaText;
  }, [schemaText]);
  const applyCompatValidation = useCallback(
    (
      text: string,
      customFieldDefinitions: readonly CatalogFieldDefinition[],
      customReportDefinitions: readonly CatalogReportDefinition[],
    ) => {
      if (!editorRef.current || !monacoRef.current) {
        return;
      }

      const monacoNs = monacoRef.current;
      const model = editorRef.current.getModel();
      if (!model) {
        return;
      }

      const runId = ++validationSequenceRef.current;
      const compatMarkers: MonacoMarkerData[] = [];
      const compatCards: EditorErrorCard[] = [];
      try {
        const parsed = JSON.parse(text);
        const result = validateMlformSchema(parsed, {
          customFieldDefinitions,
          customReportDefinitions,
        });

        if (runId !== validationSequenceRef.current) {
          return;
        }

        if (result.success) {
          setSchema(parsed);
        }

        for (const issue of result.issues) {
          const { line, column } = pathToPos(text, issue.path);
          const pathStr = issue.path.length ? issue.path.join(".") : "root";

          compatCards.push({
            line,
            column,
            path: pathStr,
            message: issue.message,
            severity: issue.severity,
          });
          compatMarkers.push({
            startLineNumber: line,
            startColumn: getCompatMarkerStartColumn(text, line, column),
            endLineNumber: line,
            endColumn: model.getLineMaxColumn(line),
            message: issue.message,
            severity:
              issue.severity === "warning"
                ? monacoNs.MarkerSeverity.Warning
                : monacoNs.MarkerSeverity.Error,
            source: "mlform-compat",
            code: pathStr,
          });
        }

        if (catalogWarningRef.current) {
          compatCards.push(catalogWarningRef.current);
          compatMarkers.push({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: model.getLineMaxColumn(1),
            message: catalogWarningRef.current.message,
            severity: monacoNs.MarkerSeverity.Warning,
            source: "mlform-compat",
            code: "catalog",
          });
        }

        monacoNs.editor.setModelMarkers(model, "mlform-compat", compatMarkers);
        compatCardsRef.current = compatCards;
      } catch {
        monacoNs.editor.setModelMarkers(model, "mlform-compat", []);
        compatCardsRef.current = catalogWarningRef.current ? [catalogWarningRef.current] : [];
      }
    },
    [setSchema],
  );

  const handleOnMount = (editor: MonacoEditorInstance, monacoNs: MonacoNamespace) => {
    editorRef.current = editor;
    monacoRef.current = monacoNs;

    defineEditorThemes(monacoNs);
    setEditorTheme(monacoNs, theme === "dark");

    (monacoNs as MonacoNamespace & MonacoJson).json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      enableSchemaRequest: false,
      schemas: [
        {
          uri: "internal://root.schema.json",
          fileMatch: ["*"],
          schema: mlformJsonSchema,
        },
      ],
    });

    applyCompatValidation(
      editor.getValue(),
      catalogFieldDefinitionsRef.current,
      catalogReportDefinitionsRef.current,
    );
  };

  const handleOnChange = (value?: string) => {
    const text = value ?? "";
    setSchemaText(text);
    applyCompatValidation(
      text,
      catalogFieldDefinitionsRef.current,
      catalogReportDefinitionsRef.current,
    );
  };

  const handleOnValidate = useCallback(
    (markers: MonacoMarker[]) => {
      if (!editorRef.current || !monacoRef.current) {
        return;
      }

      const monacoNs = monacoRef.current;
      const model = editorRef.current.getModel();
      if (!model) {
        return;
      }

      const content = model.getValue();
      const workerCards = markers.reduce<EditorErrorCard[]>((cards, marker) => {
        if (marker.source !== "mlform-compat") {
          cards.push(
            getMarkerMessage(
              content,
              {
                ...marker,
                startOffset: model.getOffsetAt({
                  lineNumber: marker.startLineNumber,
                  column: marker.startColumn,
                }),
              },
              monacoNs.MarkerSeverity.Warning,
            ),
          );
        }
        return cards;
      }, []);

      setSchemaErrors([...workerCards, ...compatCardsRef.current]);
    },
    [setSchemaErrors],
  );

  useEffect(() => {
    if (!pluginSourcesQuery.data && !pluginSourcesQuery.error) return;
    let cancelled = false;

    void (async () => {
      try {
        if (pluginSourcesQuery.error) throw pluginSourcesQuery.error;
        const sources = pluginSourcesQuery.data ?? [];
        const [customFieldDefinitions, customReportDefinitions] = await Promise.all([
          getCustomFieldDefinitions(organizationId, sources),
          getCustomReportDefinitions(organizationId, sources),
        ]);
        if (cancelled) {
          return;
        }

        catalogFieldDefinitionsRef.current = customFieldDefinitions;
        catalogReportDefinitionsRef.current = customReportDefinitions;
        catalogWarningRef.current = null;
        const nextText = editorRef.current?.getValue() ?? schemaTextRef.current;
        applyCompatValidation(nextText, customFieldDefinitions, customReportDefinitions);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        catalogFieldDefinitionsRef.current = [];
        catalogReportDefinitionsRef.current = [];
        catalogWarningRef.current = buildCatalogWarning(
          error,
          schemaNeedsPluginCatalog(editorRef.current?.getValue() ?? schemaTextRef.current),
        );
        const nextText = editorRef.current?.getValue() ?? schemaTextRef.current;
        applyCompatValidation(nextText, [], []);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyCompatValidation, organizationId, pluginSourcesQuery.data, pluginSourcesQuery.error]);

  useEffect(() => {
    if (monacoRef.current) {
      setEditorTheme(monacoRef.current, theme === "dark");
    }
  }, [theme]);

  return (
    <Suspense fallback={<div className="h-full w-full bg-[var(--surface-primary)]" />}>
      <MonacoEditor
        className="w-full"
        defaultLanguage="json"
        value={schemaText}
        onChange={handleOnChange}
        onMount={handleOnMount}
        onValidate={handleOnValidate}
        options={editorOptions}
      />
    </Suspense>
  );
}
