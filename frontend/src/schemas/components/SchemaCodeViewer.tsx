/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- Type-only Monaco import is erased from runtime.
import type * as Monaco from "monaco-editor";
import { lazy, Suspense, useEffect, useRef } from "react";
import { cx } from "@/app/components/cx";
import { themeWithHtmlAtom } from "@/app/atoms";
import { loadLocalMonacoEditor } from "@/capabilities/editor/load-local-monaco-editor";
import { defineEditorThemes, setEditorTheme } from "@/editor/utils/configure-editor-theme";
import { editorOptions } from "@/editor/utils/editorConfig";

type MonacoNamespace = typeof import("monaco-editor");

type Props = {
  value: string;
  className?: string;
};

const MonacoEditor = lazy(loadLocalMonacoEditor);

export function SchemaCodeViewer({ value, className }: Props) {
  const [theme] = useAtom(themeWithHtmlAtom);
  const monacoRef = useRef<MonacoNamespace | null>(null);

  const mount = (_editor: Monaco.editor.IStandaloneCodeEditor, monacoNs: MonacoNamespace) => {
    monacoRef.current = monacoNs;
    defineEditorThemes(monacoNs);
    setEditorTheme(monacoNs, theme === "dark");
  };

  useEffect(() => {
    if (monacoRef.current) {
      setEditorTheme(monacoRef.current, theme === "dark");
    }
  }, [theme]);

  return (
    <div
      className={cx(
        className ?? "h-[480px]",
        "overflow-hidden rounded border border-[var(--border-soft)] bg-[var(--surface-primary)]",
      )}
    >
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
