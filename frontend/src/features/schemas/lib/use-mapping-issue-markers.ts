/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtomValue } from "jotai";
import { type RefObject, useCallback, useEffect } from "react";
import { schemaMappingIssuesAtom } from "@/features/schemas/lib/editor-atoms";
import type {
  MonacoEditorInstance,
  MonacoNamespace,
} from "@/features/schemas/lib/editor-body-types";
import { mappingIssueCards } from "@/features/schemas/lib/schema-mapping-issues";

const OWNER = "schema-mapping";

type Options = {
  editorRef: RefObject<MonacoEditorInstance | null>;
  monacoRef: RefObject<MonacoNamespace | null>;
};

/** Underlines in the editor each mapping the server refused, where it now stands in the text. */
export function useMappingIssueMarkers({ editorRef, monacoRef }: Options) {
  const issues = useAtomValue(schemaMappingIssuesAtom);

  const show = useCallback(
    (text: string) => {
      const monacoNs = monacoRef.current;
      const model = editorRef.current?.getModel();
      if (!monacoNs || !model) return;
      const markers = mappingIssueCards(text, issues).map((card) => ({
        startLineNumber: card.line,
        startColumn: card.column,
        endLineNumber: card.line,
        endColumn: model.getLineMaxColumn(card.line),
        message: card.message,
        severity: monacoNs.MarkerSeverity.Error,
        source: OWNER,
        code: card.path,
      }));
      monacoNs.editor.setModelMarkers(model, OWNER, markers);
    },
    [editorRef, issues, monacoRef],
  );

  useEffect(() => {
    const text = editorRef.current?.getValue();
    if (text !== undefined) show(text);
  }, [editorRef, show]);

  return { show, owner: OWNER };
}
