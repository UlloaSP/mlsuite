/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- Type-only Monaco import is erased from runtime.
import type * as Monaco from "monaco-editor";
import { lazy, Suspense, useEffect, useRef } from "react";
import { themeWithHtmlAtom } from "../../app/atoms";
import { editorDarkTheme, editorLightTheme, editorOptions } from "../../editor/utils/editorConfig";

type MonacoNamespace = typeof import("monaco-editor");

type Props = {
  value: string;
};

const MonacoEditor = lazy(() =>
  import("@monaco-editor/react").then((module) => ({ default: module.Editor })),
);

export function SchemaCodeViewer({ value }: Props) {
  const [theme] = useAtom(themeWithHtmlAtom);
  const monacoRef = useRef<MonacoNamespace | null>(null);

  const mount = (_editor: Monaco.editor.IStandaloneCodeEditor, monacoNs: MonacoNamespace) => {
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
  };

  useEffect(() => {
    monacoRef.current?.editor.setTheme(theme === "dark" ? "corporate-dark" : "corporate-light");
  }, [theme]);

  return (
    <div className="h-[480px] overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-primary)]">
      <Suspense fallback={<div className="h-full bg-[var(--surface-primary)]" />}>
        <MonacoEditor
          className="h-full"
          defaultLanguage="json"
          value={value}
          onMount={mount}
          options={{
            ...editorOptions,
            domReadOnly: true,
            readOnly: true,
            renderValidationDecorations: "off",
          }}
        />
      </Suspense>
    </div>
  );
}
