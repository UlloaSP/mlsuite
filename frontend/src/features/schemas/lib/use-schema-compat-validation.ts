/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type RefObject, useCallback, useEffect, useRef } from "react";
import { schemaNeedsPluginCatalog } from "@/capabilities/prediction-runtime/mlform/schema-plugin-requirement";
import {
  openSchemaChecker,
  type SchemaChecker,
} from "@/capabilities/prediction-runtime/sandbox/plugin-sandbox-services";
import type { PluginCatalog } from "@/capabilities/prediction-runtime/sandbox/sandbox-protocol";
import { buildCatalogWarning } from "@/features/schemas/lib/catalog-warning";
import type {
  MonacoEditorInstance,
  MonacoMarkerData,
  MonacoNamespace,
} from "@/features/schemas/lib/editor-body-types";
import { type EditorErrorCard, pathToPos } from "@/features/schemas/lib/schema-diagnostics";

const OWNER = "mlform-compat";
const EMPTY_CATALOG: PluginCatalog = { fields: [], reports: [] };

type Issue = { path: (string | number)[]; message: string; severity: "error" | "warning" };

type Options = {
  editorRef: RefObject<MonacoEditorInstance | null>;
  monacoRef: RefObject<MonacoNamespace | null>;
  /** Told of each text that parses into a schema MLForm and the plugins accept. */
  onValid: (schema: unknown) => void;
};

/**
 * Checks the editor's schema against MLForm and the organization's plugins, as markers and error
 * cards. Plugin schemas are plugin code, so the check runs in a plugin sandbox kept open while
 * the editor is; an answer for a text that has since changed is dropped.
 */
export function useSchemaCompatValidation({ editorRef, monacoRef, onValid }: Options) {
  const checkerRef = useRef<SchemaChecker | null>(null);
  const cardsRef = useRef<EditorErrorCard[]>([]);
  const catalogRef = useRef(EMPTY_CATALOG);
  const warningRef = useRef<EditorErrorCard | null>(null);
  const jsonSchemaCatalogRef = useRef<PluginCatalog | null>(null);
  const checkRef = useRef(0);
  const onValidRef = useRef(onValid);
  onValidRef.current = onValid;

  useEffect(() => {
    const checker = openSchemaChecker();
    checkerRef.current = checker;
    return () => {
      checker.close();
      checkerRef.current = null;
    };
  }, []);

  const validate = useCallback(
    (text: string) => {
      const monacoNs = monacoRef.current;
      const model = editorRef.current?.getModel();
      const checker = checkerRef.current;
      if (!monacoNs || !model || !checker) return;
      const catalog = catalogRef.current;
      if (jsonSchemaCatalogRef.current !== catalog) {
        jsonSchemaCatalogRef.current = catalog;
        void checker.jsonSchema(catalog).then(
          (schema) => {
            if (jsonSchemaCatalogRef.current !== catalog) return;
            monacoNs.json.jsonDefaults.setDiagnosticsOptions({
              validate: true,
              enableSchemaRequest: false,
              schemas: [{ uri: "internal://root.schema.json", fileMatch: ["*"], schema }],
            });
          },
          () => {},
        );
      }
      const check = ++checkRef.current;
      const show = (issues: readonly Issue[]) => {
        const cards: EditorErrorCard[] = [];
        const markers: MonacoMarkerData[] = [];
        for (const issue of issues) {
          const { line, column } = pathToPos(text, issue.path);
          const path = issue.path.length ? issue.path.join(".") : "root";
          cards.push({ line, column, path, message: issue.message, severity: issue.severity });
          markers.push({
            startLineNumber: line,
            startColumn: column,
            endLineNumber: line,
            endColumn: model.getLineMaxColumn(line),
            message: issue.message,
            severity:
              issue.severity === "warning"
                ? monacoNs.MarkerSeverity.Warning
                : monacoNs.MarkerSeverity.Error,
            source: OWNER,
            code: path,
          });
        }
        const warning = warningRef.current;
        if (warning) {
          cards.push(warning);
          markers.push({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: model.getLineMaxColumn(1),
            message: warning.message,
            severity: monacoNs.MarkerSeverity.Warning,
            source: OWNER,
            code: "catalog",
          });
        }
        cardsRef.current = cards;
        monacoNs.editor.setModelMarkers(model, OWNER, markers);
      };
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        cardsRef.current = warningRef.current ? [warningRef.current] : [];
        monacoNs.editor.setModelMarkers(model, OWNER, []);
        return;
      }
      checker.check(parsed, catalog).then(
        (result) => {
          if (check !== checkRef.current || model.isDisposed()) return;
          if (result.success) onValidRef.current(parsed);
          show(result.issues);
        },
        (error: Error) => {
          if (check !== checkRef.current || model.isDisposed()) return;
          show([
            {
              path: [],
              message: `The schema could not be checked: ${error.message}`,
              severity: "error",
            },
          ]);
        },
      );
    },
    [editorRef, monacoRef],
  );

  /** Takes the catalog the schema is checked against, or the failure that left it empty. */
  const setCatalog = useCallback(
    (catalog: PluginCatalog | undefined, error: unknown, text: string) => {
      catalogRef.current = error ? EMPTY_CATALOG : (catalog ?? EMPTY_CATALOG);
      warningRef.current = error
        ? buildCatalogWarning(error, schemaNeedsPluginCatalog(text))
        : null;
    },
    [],
  );

  return { validate, setCatalog, cardsRef };
}
