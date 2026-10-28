/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom, useAtomValue } from "jotai";
import { lazy, Suspense, useCallback, useEffect, useRef } from "react";
import { typographyAtom } from "@/shared/ui/typography-state";
import { useQuery } from "@tanstack/react-query";
import { predictionCatalogQueryOptions } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { type EditorErrorCard, getMarkerMessage } from "@/features/schemas/lib/schema-diagnostics";
import { loadLocalMonacoEditor } from "@/capabilities/editor/load-local-monaco-editor";
import {
  editorCheckErrorsAtom,
  schemaAtom,
  schemaTextAtom,
} from "@/features/schemas/lib/editor-atoms";
import { useMappingIssueMarkers } from "@/features/schemas/lib/use-mapping-issue-markers";
import { useSchemaCompatValidation } from "@/features/schemas/lib/use-schema-compat-validation";
import {
  applyEditorTheme,
  useEditorAppearance,
} from "@/capabilities/editor/configure-editor-theme";
import { editorOptionsFor } from "@/capabilities/editor/editor-options";
import type {
  MonacoEditorInstance,
  MonacoMarker,
  MonacoNamespace,
} from "@/features/schemas/lib/editor-body-types";

const MonacoEditor = lazy(loadLocalMonacoEditor);

export function EditorBody() {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const [schemaText, setSchemaText] = useAtom(schemaTextAtom);
  const [, setSchema] = useAtom(schemaAtom);
  const [, setSchemaErrors] = useAtom(editorCheckErrorsAtom);
  const appearance = useEditorAppearance();
  const typography = useAtomValue(typographyAtom);
  const { data: catalog, error: catalogError } = useQuery(
    predictionCatalogQueryOptions(organizationId),
  );

  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoNamespace | null>(null);
  const schemaTextRef = useRef(schemaText);
  useEffect(() => {
    schemaTextRef.current = schemaText;
  }, [schemaText]);
  const {
    validate: applyCompatValidation,
    setCatalog,
    cardsRef: compatCardsRef,
  } = useSchemaCompatValidation({ editorRef, monacoRef, onValid: setSchema });
  const mappingMarkers = useMappingIssueMarkers({ editorRef, monacoRef });

  const handleOnMount = (editor: MonacoEditorInstance, monacoNs: MonacoNamespace) => {
    editorRef.current = editor;
    monacoRef.current = monacoNs;

    applyEditorTheme(monacoNs, appearance.dark);

    applyCompatValidation(editor.getValue());
    mappingMarkers.show(editor.getValue());
  };

  const handleOnChange = (value?: string) => {
    const text = value ?? "";
    setSchemaText(text);
    applyCompatValidation(text);
    mappingMarkers.show(text);
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
        if (marker.source !== "mlform-compat" && marker.source !== mappingMarkers.owner) {
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
    [compatCardsRef, mappingMarkers.owner, setSchemaErrors],
  );

  useEffect(() => {
    if (!catalog && !catalogError) return;
    const text = editorRef.current?.getValue() ?? schemaTextRef.current;
    setCatalog(catalog, catalogError, text);
    applyCompatValidation(text);
  }, [applyCompatValidation, catalog, catalogError, setCatalog]);

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
