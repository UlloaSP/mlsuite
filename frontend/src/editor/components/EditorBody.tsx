/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- Type-only import; editor component is lazy-loaded below.
import type * as Monaco from "monaco-editor";
import { lazy, Suspense, useCallback, useEffect, useRef } from "react";
import { themeWithHtmlAtom } from "../../app/atoms";
import {
  getCustomFieldDefinitions,
  type CatalogFieldDefinition,
} from "../../plugin/mlform/custom-field";
import {
  getCustomReportDefinitions,
  type CatalogReportDefinition,
} from "../../plugin/mlform/custom-report";
import { invalidatePluginCatalog } from "../../plugin/mlform/plugin-catalog";
import { pluginCatalogVersionAtom } from "../../plugin/mlform/plugin-catalog-state";
import { schemaNeedsPluginCatalog } from "../../plugin/mlform/schema-needs-plugin-catalog";
import { mlformJsonSchema, validateMlformSchema } from "../../app/utils/mlform/schema-validation";
import {
  type EditorErrorCard,
  getCompatMarkerStartColumn,
  getMarkerMessage,
  pathToPos,
} from "./editor-schema-diagnostics";
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "../atoms";
import { editorDarkTheme, editorLightTheme, editorOptions } from "../utils/editorConfig";

type MonacoNamespace = typeof import("monaco-editor");
const MonacoEditor = lazy(() =>
  import("@monaco-editor/react").then((module) => ({ default: module.Editor })),
);

export function EditorBody() {
  const [schemaText, setSchemaText] = useAtom(schemaTextAtom);
  const [, setSchema] = useAtom(schemaAtom);
  const [, setSchemaErrors] = useAtom(schemaErrorsAtom);
  const [theme] = useAtom(themeWithHtmlAtom);
  const [pluginCatalogVersion] = useAtom(pluginCatalogVersionAtom);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<MonacoNamespace | null>(null);
  const compatCardsRef = useRef<EditorErrorCard[]>([]);
  const validationSequenceRef = useRef(0);
  const catalogFieldDefinitionsRef = useRef<readonly CatalogFieldDefinition[]>([]);
  const catalogReportDefinitionsRef = useRef<readonly CatalogReportDefinition[]>([]);
  const catalogWarningRef = useRef<EditorErrorCard | null>(null);
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
      const compatMarkers: Monaco.editor.IMarkerData[] = [];
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

  const handleOnMount = (
    editor: Monaco.editor.IStandaloneCodeEditor,
    monacoNs: MonacoNamespace,
  ) => {
    editorRef.current = editor;
    monacoRef.current = monacoNs;

    monacoNs.editor.defineTheme(
      "corporate-light",
      editorLightTheme as Monaco.editor.IStandaloneThemeData,
    );
    monacoNs.editor.defineTheme(
      "corporate-dark",
      editorDarkTheme as Monaco.editor.IStandaloneThemeData,
    );
    monacoNs.editor.setTheme(theme === "dark" ? "corporate-dark" : "corporate-light");

    (
      monacoNs.languages as typeof Monaco.languages & {
        json: {
          jsonDefaults: {
            setDiagnosticsOptions(options: unknown): void;
          };
        };
      }
    ).json.jsonDefaults.setDiagnosticsOptions({
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
    (markers: Monaco.editor.IMarker[]) => {
      if (!editorRef.current) {
        return;
      }

      const model = editorRef.current.getModel();
      if (!model) {
        return;
      }

      const content = model.getValue();
      const workerCards = markers.reduce<EditorErrorCard[]>((cards, marker) => {
        if (marker.source !== "mlform-compat") {
          cards.push(
            getMarkerMessage(content, {
              ...marker,
              startOffset: model.getOffsetAt({
                lineNumber: marker.startLineNumber,
                column: marker.startColumn,
              }),
            }),
          );
        }
        return cards;
      }, []);

      setSchemaErrors([...workerCards, ...compatCardsRef.current]);
    },
    [setSchemaErrors],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [customFieldDefinitions, customReportDefinitions] = await Promise.all([
          getCustomFieldDefinitions(),
          getCustomReportDefinitions(),
        ]);
        if (cancelled) {
          return;
        }

        catalogFieldDefinitionsRef.current = customFieldDefinitions;
        catalogReportDefinitionsRef.current = customReportDefinitions;
        catalogWarningRef.current = null;
        const nextText = editorRef.current?.getValue() ?? schemaText;
        applyCompatValidation(nextText, customFieldDefinitions, customReportDefinitions);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        catalogFieldDefinitionsRef.current = [];
        catalogReportDefinitionsRef.current = [];
        catalogWarningRef.current = {
          line: 1,
          column: 1,
          path: "catalog",
          message:
            error instanceof Error
              ? `Custom plugin catalog could not be loaded: ${error.message}`
              : `Custom plugin catalog could not be loaded: ${String(error)}`,
          severity: schemaNeedsPluginCatalog(editorRef.current?.getValue() ?? schemaText)
            ? "error"
            : "warning",
        };
        const nextText = editorRef.current?.getValue() ?? schemaText;
        applyCompatValidation(nextText, [], []);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyCompatValidation, pluginCatalogVersion, schemaText]);

  useEffect(() => {
    invalidatePluginCatalog();
  }, [pluginCatalogVersion]);

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === "dark" ? "corporate-dark" : "corporate-light");
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
