/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom, useAtomValue } from "jotai";
import { lazy, Suspense, useCallback, useEffect, useRef } from "react";
import { typographyAtom } from "@/shared/ui/typography-state";
import { useQuery } from "@tanstack/react-query";
import type { PredictionCatalogDefinitions } from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import { predictionCatalogQueryOptions } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { schemaNeedsPluginCatalog } from "@/capabilities/prediction-runtime/mlform/schema-plugin-requirement";
import {
  createMlformJsonSchema,
  validateMlformSchema,
} from "@/capabilities/prediction-runtime/mlform/schema-validation";
import { buildCatalogWarning } from "@/features/schemas/lib/catalog-warning";
import {
  type EditorErrorCard,
  getMarkerMessage,
  pathToPos,
} from "@/features/schemas/lib/schema-diagnostics";
import { loadLocalMonacoEditor } from "@/capabilities/editor/load-local-monaco-editor";
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "@/features/schemas/lib/editor-atoms";
import {
  applyEditorTheme,
  useEditorAppearance,
} from "@/capabilities/editor/configure-editor-theme";
import { editorOptionsFor } from "@/capabilities/editor/editor-options";
import type {
  MonacoEditorInstance,
  MonacoMarker,
  MonacoMarkerData,
  MonacoNamespace,
} from "@/features/schemas/lib/editor-body-types";

const MonacoEditor = lazy(loadLocalMonacoEditor);

const EMPTY_CATALOG: PredictionCatalogDefinitions = { fieldDefinitions: [], reportDefinitions: [] };

export function EditorBody() {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const [schemaText, setSchemaText] = useAtom(schemaTextAtom);
  const [, setSchema] = useAtom(schemaAtom);
  const [, setSchemaErrors] = useAtom(schemaErrorsAtom);
  const appearance = useEditorAppearance();
  const typography = useAtomValue(typographyAtom);
  const { data: catalog, error: catalogError } = useQuery(
    predictionCatalogQueryOptions(organizationId),
  );

  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoNamespace | null>(null);
  const compatCardsRef = useRef<EditorErrorCard[]>([]);
  const catalogRef = useRef(EMPTY_CATALOG);
  const catalogWarningRef = useRef<EditorErrorCard | null>(null);
  const schemaTextRef = useRef(schemaText);
  const jsonSchemaCatalogRef = useRef<PredictionCatalogDefinitions | null>(null);
  useEffect(() => {
    schemaTextRef.current = schemaText;
  }, [schemaText]);
  const applyCompatValidation = useCallback(
    (text: string, definitions: PredictionCatalogDefinitions) => {
      if (!editorRef.current || !monacoRef.current) {
        return;
      }

      const monacoNs = monacoRef.current;
      const model = editorRef.current.getModel();
      if (!model) {
        return;
      }

      const customFieldDefinitions = definitions.fieldDefinitions;
      const customReportDefinitions = definitions.reportDefinitions;
      if (jsonSchemaCatalogRef.current !== definitions) {
        monacoNs.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          enableSchemaRequest: false,
          schemas: [
            {
              uri: "internal://root.schema.json",
              fileMatch: ["*"],
              schema: createMlformJsonSchema({
                customFieldDefinitions,
                customReportDefinitions,
              }),
            },
          ],
        });
        jsonSchemaCatalogRef.current = definitions;
      }
      const compatMarkers: MonacoMarkerData[] = [];
      const compatCards: EditorErrorCard[] = [];
      try {
        const parsed = JSON.parse(text);
        const result = validateMlformSchema(parsed, {
          customFieldDefinitions,
          customReportDefinitions,
        });

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
            startColumn: column,
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

    applyEditorTheme(monacoNs, appearance.dark);

    applyCompatValidation(editor.getValue(), catalogRef.current);
  };

  const handleOnChange = (value?: string) => {
    const text = value ?? "";
    setSchemaText(text);
    applyCompatValidation(text, catalogRef.current);
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
    if (!catalog && !catalogError) return;
    const text = editorRef.current?.getValue() ?? schemaTextRef.current;
    catalogRef.current = catalogError ? EMPTY_CATALOG : (catalog ?? EMPTY_CATALOG);
    catalogWarningRef.current = catalogError
      ? buildCatalogWarning(catalogError, schemaNeedsPluginCatalog(text))
      : null;
    applyCompatValidation(text, catalogRef.current);
  }, [applyCompatValidation, catalog, catalogError]);

  // Tokens change with mode, palette, and contrast; rebuild the theme from them.
  useEffect(() => {
    if (monacoRef.current) applyEditorTheme(monacoRef.current, appearance.dark);
  }, [appearance.key, appearance.dark]);

  return (
    <Suspense fallback={<div className="h-full w-full bg-surface" />}>
      <MonacoEditor
        className="w-full"
        defaultLanguage="json"
        value={schemaText}
        onChange={handleOnChange}
        onMount={handleOnMount}
        onValidate={handleOnValidate}
        options={editorOptionsFor(typography)}
      />
    </Suspense>
  );
}
